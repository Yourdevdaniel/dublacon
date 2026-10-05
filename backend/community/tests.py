from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from projects.models import ProjectUpdate
from .models import Notification


# CPFs de teste sinteticos (000.000.00N + digitos verificadores): validos no
# algoritmo e obviamente ficticios.


class FollowTest(TestCase):
    def setUp(self):
        self.ana = User.objects.create_user("ana@example.com", "Ana", "00000000191", password="x")
        self.beto = User.objects.create_user("beto@example.com", "Beto", "00000000272", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.ana)

    def test_seguir_e_toggle(self):
        resp = self.client.post(f"/api/users/{self.beto.id}/seguir/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["sigo"])
        self.assertEqual(resp.data["seguidores_count"], 1)
        # seguir de novo desfaz
        resp = self.client.post(f"/api/users/{self.beto.id}/seguir/")
        self.assertFalse(resp.data["sigo"])
        self.assertEqual(resp.data["seguidores_count"], 0)

    def test_nao_segue_a_si_mesmo(self):
        resp = self.client.post(f"/api/users/{self.ana.id}/seguir/")
        self.assertEqual(resp.status_code, 400)

    def test_notificacao_de_novo_seguidor(self):
        self.client.post(f"/api/users/{self.beto.id}/seguir/")
        notif = Notification.objects.get(recipient=self.beto)
        self.assertEqual(notif.verb, Notification.Verb.NOVO_SEGUIDOR)
        self.assertEqual(notif.target.follower, self.ana)

    def test_feed_seguindo_filtra_por_quem_sigo(self):
        carla = User.objects.create_user("carla@example.com", "Carla", "00000000353", password="x")
        ProjectUpdate.objects.create(author=self.beto, conteudo="post do beto")
        ProjectUpdate.objects.create(author=carla, conteudo="post da carla")
        self.client.post(f"/api/users/{self.beto.id}/seguir/")

        resp = self.client.get("/api/updates/?seguindo=1")
        self.assertEqual([u["conteudo"] for u in resp.data["results"]], ["post do beto"])
