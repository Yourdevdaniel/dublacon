from django.test import TestCase
from rest_framework.test import APIClient

from .models import BannedIP, User


# CPFs de teste sinteticos (000.000.00N + digitos verificadores): validos no
# algoritmo e obviamente ficticios.


class BanimentoTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            "admin@example.com", "Admin", "00000000191", password="x", is_staff=True
        )
        self.mau = User.objects.create_user("mau@example.com", "Mau Elemento", "00000000272", password="x")
        self.mau.registration_ip = "10.0.0.9"
        self.mau.save(update_fields=["registration_ip"])
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_banir_desativa_conta_e_bloqueia_ip(self):
        resp = self.client.post(f"/api/users/{self.mau.id}/banir/", {"banir_ip": True}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["is_active"])
        self.assertTrue(BannedIP.objects.filter(ip="10.0.0.9").exists())

        # banido some da busca de nao-admins e nao consegue logar
        outro = User.objects.create_user("outro@example.com", "Outra Pessoa", "00000000353", password="x")
        c2 = APIClient()
        c2.force_authenticate(outro)
        ids = [u["id"] for u in c2.get("/api/users/").data]
        self.assertNotIn(self.mau.id, ids)
        login = APIClient().post("/api/auth/login/", {"username": "mau@example.com", "password": "x"})
        self.assertEqual(login.status_code, 400)

        # desbanir reativa
        resp = self.client.post(f"/api/users/{self.mau.id}/banir/")
        self.assertTrue(resp.data["is_active"])

    def test_nao_bane_admin(self):
        resp = self.client.post(f"/api/users/{self.admin.id}/banir/")
        self.assertEqual(resp.status_code, 400)

    def test_usuario_comum_nao_bane(self):
        c = APIClient()
        c.force_authenticate(self.mau)
        resp = c.post(f"/api/users/{self.admin.id}/banir/")
        self.assertEqual(resp.status_code, 403)

    def test_verificacao_fluxo_aprovacao(self):
        c = APIClient()
        c.force_authenticate(self.mau)
        resp = c.post("/api/verificacao/", {"tipo": "influencer", "justificativa": "10k no YouTube"})
        self.assertEqual(resp.status_code, 201)

        resp = self.client.post(f"/api/verificacao/{resp.data['id']}/aprovar/")
        self.assertEqual(resp.status_code, 200)
        self.mau.refresh_from_db()
        self.assertEqual(self.mau.verified, "influencer")

    def test_verificacao_ator_exige_drt(self):
        c = APIClient()
        c.force_authenticate(self.mau)
        resp = c.post("/api/verificacao/", {"tipo": "ator"})
        self.assertEqual(resp.status_code, 400)

    def test_ip_banido_nao_cadastra(self):
        BannedIP.objects.create(ip="127.0.0.1")  # IP do test client
        resp = APIClient().post("/api/auth/register/", {
            "email": "novo@example.com", "nome": "Novo", "cpf": "00000000434", "password": "SenhaForte123!",
        })
        self.assertEqual(resp.status_code, 403)


class UrlDeMidiaTest(TestCase):
    """Frontend e API rodam em origens diferentes (5190 e 8010 no compose), entao
    foto/capa/arquivo precisam sair como URL absoluta, nao como /media/..."""

    FOTO = "http://testserver/media/fotos_perfil/ana.jpg"

    def setUp(self):
        self.ana = User.objects.create_user("ana@example.com", "Ana", "00000000191", password="x")
        self.beto = User.objects.create_user("beto@example.com", "Beto", "00000000272", password="x")
        self.ana.foto = "fotos_perfil/ana.jpg"  # so o caminho; o serializer nao abre o arquivo
        self.ana.save(update_fields=["foto"])
        self.client = APIClient()
        self.client.force_authenticate(self.ana)

    def test_me_devolve_foto_absoluta(self):
        self.assertEqual(self.client.get("/api/auth/me/").data["foto"], self.FOTO)
        resp = self.client.patch("/api/auth/me/", {"bio": "dubladora"}, format="json")
        self.assertEqual(resp.data["foto"], self.FOTO)

    def test_listas_de_seguidores_devolvem_foto_absoluta(self):
        self.client.post(f"/api/users/{self.beto.id}/seguir/")
        seguidores = self.client.get(f"/api/users/{self.beto.id}/seguidores/").data
        seguindo = self.client.get(f"/api/users/{self.ana.id}/seguindo/").data
        self.assertEqual(seguidores[0]["foto"], self.FOTO)
        self.assertEqual(seguindo[0]["id"], self.beto.id)
        self.assertIsNone(seguindo[0]["foto"])
