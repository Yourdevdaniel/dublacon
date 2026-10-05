from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Role, User
from .models import Application, Project, ProjectVaga


# CPFs de teste sinteticos (000.000.00N + digitos verificadores): validos no
# algoritmo e obviamente ficticios.


class PostagemFeedTest(TestCase):
    """Post sem project = postagem normal de qualquer usuario;
    post com project = atualizacao que so o dono pode publicar."""

    def setUp(self):
        self.ana = User.objects.create_user("ana@example.com", "Ana", "00000000191", password="x")
        self.beto = User.objects.create_user("beto@example.com", "Beto", "00000000272", password="x")
        self.projeto = Project.objects.create(owner=self.ana, nome="Fandub", descricao="d")
        self.client = APIClient()

    def test_qualquer_usuario_posta_sem_projeto(self):
        self.client.force_authenticate(self.beto)
        resp = self.client.post("/api/updates/", {"conteudo": "oi comunidade"})
        self.assertEqual(resp.status_code, 201)
        self.assertIsNone(resp.data["project"])
        self.assertIsNone(resp.data["project_nome"])

    def test_so_dono_posta_atualizacao_do_projeto(self):
        self.client.force_authenticate(self.beto)
        resp = self.client.post("/api/updates/", {"conteudo": "invasao", "project": self.projeto.id})
        self.assertEqual(resp.status_code, 403)

        self.client.force_authenticate(self.ana)
        resp = self.client.post("/api/updates/", {"conteudo": "novo ep!", "project": self.projeto.id})
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["project_nome"], "Fandub")


class CandidaturaDecididaTest(TestCase):
    def test_aceitar_devolve_urls_absolutas(self):
        dono = User.objects.create_user("dono@example.com", "Dono", "00000000191", password="x")
        ana = User.objects.create_user("ana@example.com", "Ana", "00000000272", password="x")
        User.objects.filter(pk=ana.pk).update(foto="fotos_perfil/ana.jpg")
        projeto = Project.objects.create(owner=dono, nome="Fandub", descricao="d")
        vaga = ProjectVaga.objects.create(project=projeto, role=Role.objects.first(), titulo="Voz")
        candidatura = Application.objects.create(vaga=vaga, applicant=ana, audio="testes_voz/ana.wav")

        client = APIClient()
        client.force_authenticate(dono)
        resp = client.post(f"/api/candidaturas/{candidatura.id}/aceitar/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["applicant"]["foto"], "http://testserver/media/fotos_perfil/ana.jpg")
        self.assertEqual(resp.data["audio"], "http://testserver/media/testes_voz/ana.wav")
