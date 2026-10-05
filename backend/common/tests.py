import io
import shutil
import tempfile
import wave

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import Role, User
from common.testing import TEST_PASSWORD
from community.models import Report
from projects.models import Project, ProjectVaga

# CPFs de teste sinteticos (000.000.00N + digitos verificadores): validos no
# algoritmo e obviamente ficticios.


HTML = b"<html><script>alert(1)</script></html>"


def wav_valido():
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(b"\0\0" * 800)
    return SimpleUploadedFile("teste.wav", buf.getvalue(), "audio/wav")


def png_grande():
    # 1400x1400 RGB sem compressao ~5.9MB, acima do limite de 5MB
    buf = io.BytesIO()
    Image.new("RGB", (1400, 1400)).save(buf, "PNG", compress_level=0)
    return SimpleUploadedFile("grande.png", buf.getvalue(), "image/png")


class UploadTest(TestCase):
    def setUp(self):
        media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media, ignore_errors=True)
        override = override_settings(MEDIA_ROOT=media)
        override.enable()
        self.addCleanup(override.disable)

        self.dono = User.objects.create_user("dono@example.com", "Dono", "00000000191", password=TEST_PASSWORD)
        self.ana = User.objects.create_user("ana@example.com", "Ana", "00000000272", password=TEST_PASSWORD)
        projeto = Project.objects.create(owner=self.dono, nome="Fandub", descricao="d")
        self.vaga = ProjectVaga.objects.create(project=projeto, role=Role.objects.first(), titulo="Voz")
        self.client = APIClient()
        self.client.force_authenticate(self.ana)

    def candidatar(self, audio):
        return self.client.post("/api/candidaturas/", {"vaga": self.vaga.id, "audio": audio}, format="multipart")

    def test_html_disfarcado_de_mp3_e_recusado(self):
        resp = self.candidatar(SimpleUploadedFile("teste.mp3", HTML, "audio/mpeg"))
        self.assertEqual(resp.status_code, 400)
        self.assertIn("audio", resp.data)

    def test_audio_valido_e_aceito(self):
        resp = self.candidatar(wav_valido())
        self.assertEqual(resp.status_code, 201)

    def test_html_disfarcado_de_jpg_no_portfolio_e_recusado(self):
        resp = self.client.post(
            "/api/portfolio/",
            {"titulo": "Arte", "arquivo": SimpleUploadedFile("arte.jpg", HTML, "image/jpeg")},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_imagem_acima_do_limite_e_recusada(self):
        resp = self.client.post(
            "/api/projects/", {"nome": "x", "descricao": "y", "capa": png_grande()}, format="multipart"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("capa", resp.data)

    def test_evidencia_acima_do_limite_e_recusada_sem_criar_denuncia(self):
        resp = self.client.post(
            "/api/denuncias/",
            {"reported_user_id": self.dono.id, "reason": "spam", "descricao": "d", "evidencias": [png_grande()]},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("evidencias", resp.data)
        self.assertFalse(Report.objects.exists())
