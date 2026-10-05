"""Popula o banco com dados de exemplo e imagens geradas (Pillow).

Rodar: docker compose exec -T backend python manage.py shell -c "exec(open('seed.py').read())"
Idempotente: se o seed ja foi aplicado, nao faz nada.
Senha de todos os usuarios de exemplo: dublacon123
"""

import io
import random
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile
from django.contrib.contenttypes.models import ContentType

from accounts.models import PortfolioItem, Role, User
from community.models import Follow, Message, Notification, Rating, notify
from projects.models import Application, Comment, Episode, Like, Project, ProjectUpdate, ProjectVaga

random.seed(42)

if User.objects.filter(email="ana.voz@example.com").exists():
    print("Seed ja aplicado — nada a fazer.")
else:
    # ---------- geracao de imagens ----------
    PALETAS = [
        ((255, 106, 61), (255, 187, 61)),   # laranja -> dourado
        ((61, 106, 255), (61, 219, 255)),   # azul -> ciano
        ((156, 61, 255), (255, 61, 190)),   # roxo -> rosa
        ((26, 158, 110), (144, 224, 89)),   # verde
        ((255, 61, 76), (255, 140, 61)),    # vermelho -> laranja
        ((30, 41, 82), (98, 118, 199)),     # azul noite
    ]

    def fonte(tamanho):
        # A fonte padrão do Pillow não tem acentos; tenta antes uma TrueType comum
        # (DejaVu vem no Dockerfile, Arial no Windows e no macOS).
        for nome in ("DejaVuSans-Bold.ttf", "DejaVuSans.ttf", "arialbd.ttf", "Arial Bold.ttf", "arial.ttf"):
            try:
                return ImageFont.truetype(nome, tamanho)
            except OSError:
                continue
        try:
            return ImageFont.load_default(size=tamanho)
        except TypeError:  # Pillow antigo
            return ImageFont.load_default()

    def gradiente(w, h, c1, c2):
        img = Image.new("RGB", (w, h))
        for y in range(h):
            t = y / h
            cor = tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))
            ImageDraw.Draw(img).line([(0, y), (w, y)], fill=cor)
        return img

    def capa_projeto(titulo, paleta):
        img = gradiente(800, 600, *paleta)
        d = ImageDraw.Draw(img, "RGBA")
        # circulos decorativos translucidos
        for _ in range(6):
            x, y = random.randint(-100, 800), random.randint(-100, 600)
            r = random.randint(60, 220)
            d.ellipse([x, y, x + r, y + r], fill=(255, 255, 255, 28))
        d.text((40, 480), titulo, font=fonte(56), fill=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=88)
        return ContentFile(buf.getvalue(), name="capa.jpg")

    def avatar(nome, paleta):
        img = gradiente(300, 400, *paleta)
        d = ImageDraw.Draw(img)
        inicial = nome[0].upper()
        d.text((150, 190), inicial, font=fonte(160), fill=(255, 255, 255), anchor="mm")
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=88)
        return ContentFile(buf.getvalue(), name="avatar.jpg")

    def foto_post(texto, paleta):
        img = gradiente(800, 450, *paleta)
        d = ImageDraw.Draw(img, "RGBA")
        d.rectangle([30, 330, 770, 420], fill=(0, 0, 0, 90))
        d.text((50, 350), texto, font=fonte(40), fill=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=88)
        return ContentFile(buf.getvalue(), name="post.jpg")

    def gerar_cpf():
        n = [random.randint(0, 9) for _ in range(9)]
        d1 = sum(x * w for x, w in zip(n, range(10, 1, -1))) * 10 % 11 % 10
        n.append(d1)
        d2 = sum(x * w for x, w in zip(n, range(11, 1, -1))) * 10 % 11 % 10
        n.append(d2)
        cpf = "".join(map(str, n))
        return cpf if len(set(cpf)) > 1 else gerar_cpf()

    # ---------- papeis ----------
    papeis = {}
    for nome in ["Dublador", "Animador", "Desenhista", "Roteirista", "Editor"]:
        papeis[nome], _ = Role.objects.get_or_create(nome=nome)

    # ---------- usuarios ----------
    USUARIOS = [
        ("Ana Vozes", "ana.voz@example.com", "Dubladora amadora apaixonada por vilãs de anime. 3 anos de fandub.", ["Dublador"]),
        ("Beto Sketch", "beto.sketch@example.com", "Desenho desde criança, agora animando no Krita. Bora criar!", ["Desenhista", "Animador"]),
        ("Carla Roteiro", "carla.roteiro@example.com", "Escrevo histórias de fantasia e ficção científica. Procuro projetos pra roteirizar.", ["Roteirista"]),
        ("Davi Timbre", "davi.timbre@example.com", "Voz grave, especialidade em narração e personagens sérios.", ["Dublador", "Editor"]),
        ("Elisa Frames", "elisa.frames@example.com", "Animadora 2D, fã de Studio Ghibli. Aprendendo rigging.", ["Animador"]),
        ("Felipe Traço", "felipe.traco@example.com", "Desenhista de HQ, meu sonho é publicar uma graphic novel.", ["Desenhista"]),
        ("Gabi Melodia", "gabi.melodia@example.com", "Dublo, canto e edito áudio. Faço de tudo um pouco!", ["Dublador", "Editor"]),
        ("Hugo Plot", "hugo.plot@example.com", "Roteirista de comédia. Se o projeto tem piada ruim, fui eu.", ["Roteirista"]),
    ]

    usuarios = []
    for i, (nome, email, bio, roles_nomes) in enumerate(USUARIOS):
        u = User.objects.create_user(email, nome, gerar_cpf(), password="dublacon123", bio=bio)
        u.foto.save("avatar.jpg", avatar(nome, PALETAS[i % len(PALETAS)]), save=True)
        u.roles.set([papeis[r] for r in roles_nomes])
        usuarios.append(u)

    ana, beto, carla, davi, elisa, felipe, gabi, hugo = usuarios

    # ---------- portfolio ----------
    PORTFOLIOS = [
        (ana, "Demo de vozes 2025", "Reel com 8 personagens diferentes", "https://soundcloud.com/exemplo/demo-ana"),
        (ana, "Fandub - Cena da Rainha", "Minha versão da cena final da temporada 2", "https://youtube.com/watch?v=exemplo1"),
        (beto, "Animação de caminhada", "Ciclo de caminhada 2D, 24 frames", "https://youtube.com/watch?v=exemplo2"),
        (carla, "Roteiro - O Último Farol", "Curta de 12 páginas, drama", "https://docs.google.com/exemplo"),
        (davi, "Narração de trailer", "Trailer fake estilo cinema", "https://soundcloud.com/exemplo/trailer-davi"),
        (elisa, "Sakuga fanart animada", "Homenagem animada, 6 segundos", "https://youtube.com/watch?v=exemplo3"),
        (felipe, "HQ - Cidade Cinza cap. 1", "Primeiro capítulo completo, 22 páginas", "https://artstation.com/exemplo"),
        (gabi, "Cover + dublagem musical", "Abertura dublada e cantada em PT-BR", "https://youtube.com/watch?v=exemplo4"),
    ]
    for user, titulo, desc, link in PORTFOLIOS:
        PortfolioItem.objects.create(user=user, titulo=titulo, descricao=desc, link=link)

    # ---------- projetos ----------
    PROJETOS = [
        (ana, "As Crônicas de Aurora", "Série de animação original de fantasia: uma guerreira precisa reunir os cinco reinos antes do eclipse. Buscamos elenco completo pra temporada 1 (6 episódios).", "Animação", "aberto"),
        (beto, "Fandub - Cavaleiros do Vento", "Redublagem completa em PT-BR do clássico anime dos anos 90. Já temos 40% do elenco, faltam vozes principais!", "Fandub", "aberto"),
        (carla, "O Último Farol", "Curta animado de drama: o faroleiro que se recusa a apagar a luz. Roteiro pronto, precisamos de arte e voz.", "Curta", "aberto"),
        (davi, "Podcast Ficção: Estação Zero", "Audiodrama de ficção científica em 8 episódios. Gravação remota, cronograma tranquilo.", "Audiodrama", "aberto"),
        (elisa, "Café com Pixels", "Websérie animada de comédia sobre uma cafeteria mal-assombrada. Episódios curtos de 3 min.", "Animação", "em_producao"),
        (felipe, "HQ Colaborativa: Cidade Cinza", "Graphic novel noir feita a várias mãos. Procuro roteirista e mais um desenhista pro capítulo 3.", "HQ", "aberto"),
    ]

    projetos = []
    for i, (dono, nome, desc, cat, status) in enumerate(PROJETOS):
        p = Project.objects.create(owner=dono, nome=nome, descricao=desc, categoria=cat, status=status)
        p.capa.save("capa.jpg", capa_projeto(nome, PALETAS[i % len(PALETAS)]), save=True)
        projetos.append(p)

    aurora, cavaleiros, farol, estacao, cafe, cidade = projetos

    # ---------- vagas ----------
    VAGAS = [
        (aurora, "Dublador", "Voz da Aurora (protagonista)", "Personagem determinada, 16-25 anos de voz. Teste com 3 falas.", 1),
        (aurora, "Dublador", "Vozes secundárias", "Vários personagens do reino. Ótimo pra quem está começando!", 3),
        (aurora, "Animador", "Animador de cenas de ação", "Krita ou Blender. 2-3 cortes por episódio.", 2),
        (cavaleiros, "Dublador", "Voz do Kaito (protagonista)", "Voz jovem e energética.", 1),
        (cavaleiros, "Editor", "Mixagem de episódio", "Sincronizar vozes com o vídeo original.", 1),
        (farol, "Desenhista", "Arte conceitual do farol", "Estilo pintura digital, tons frios.", 1),
        (farol, "Dublador", "Voz do faroleiro", "Voz madura, cansada, esperançosa.", 1),
        (estacao, "Dublador", "Tripulação da estação", "4 personagens fixos pro audiodrama.", 4),
        (estacao, "Roteirista", "Co-roteirista", "Revisar e escrever 2 episódios.", 1),
        (cidade, "Roteirista", "Roteiro do capítulo 3", "Noir, mistério, diálogo afiado.", 1),
        (cidade, "Desenhista", "Desenhista de páginas", "6 páginas por mês, estilo livre dentro do noir.", 1),
    ]
    vagas = []
    for proj, role, titulo, desc, qtd in VAGAS:
        vagas.append(ProjectVaga.objects.create(project=proj, role=papeis[role], titulo=titulo, descricao=desc, quantidade=qtd))

    # ---------- candidaturas (algumas aceitas = elenco) ----------
    CANDIDATURAS = [
        (gabi, vagas[0], "Sou apaixonada por protagonistas fortes! Segue minha demo no portfólio.", "aceita"),
        (davi, vagas[3], "Voz jovem não é meu forte, mas topo fazer teste!", "pendente"),
        (ana, vagas[6], "Adoro personagens densos, seria uma honra.", "aceita"),
        (elisa, vagas[2], "Animo no Krita há 2 anos, posso mostrar meu ciclo de caminhada.", "aceita"),
        (hugo, vagas[8], "Comédia é meu forte mas escrevo drama espacial também!", "pendente"),
        (hugo, vagas[9], "Noir com piadas secas? Conta comigo.", "aceita"),
        (gabi, vagas[4], "Edito áudio no Reaper, já mixei 3 fandubs.", "pendente"),
        (beto, vagas[10], "Meu traço combina com noir, olha a Cidade Cinza... ah não, sou eu no cap 1 haha", "pendente"),
    ]
    for applicant, vaga, msg, status in CANDIDATURAS:
        app = Application.objects.create(vaga=vaga, applicant=applicant, mensagem=msg, status=status)
        if status == "aceita":
            notify(applicant, Notification.Verb.CANDIDATURA_ACEITA, target=app)

    # ---------- posts (atualizacoes de projeto + posts normais) ----------
    POSTS = [
        (ana, aurora, "Elenco da Aurora fechado! 🎉 Bem-vinda, Gabi Melodia! Primeira leitura de roteiro sábado às 19h no Discord.", True),
        (beto, cavaleiros, "40% das falas do episódio 1 já gravadas. A qualidade tá surreal, gente.", True),
        (carla, farol, "Storyboard das 3 primeiras cenas aprovado. Olha esse frame conceitual!", True),
        (elisa, cafe, "Episódio piloto de Café com Pixels sai semana que vem! Ansiosa demais.", True),
        (gabi, None, "Gente, acabei de gravar meu primeiro teste pra protagonista... coração a mil! 🎙️", False),
        (davi, None, "Dica pra quem grava em casa: cobertor na parede muda TUDO na acústica. Testem!", True),
        (felipe, None, "Página 12 da Cidade Cinza saindo do forno. Noir é 90% sombra e 10% arrependimento.", True),
        (hugo, None, "Escrevi 3 piadas hoje. Apaguei 2. Progresso.", False),
    ]
    posts = []
    for autor, proj, texto, com_foto in POSTS:
        post = ProjectUpdate.objects.create(project=proj, author=autor, conteudo=texto)
        if com_foto:
            post.foto.save("post.jpg", foto_post(proj.nome if proj else autor.nome, random.choice(PALETAS)), save=True)
        posts.append(post)

    # ---------- comentarios e curtidas ----------
    COMENTARIOS = [
        (posts[0], gabi, "Obrigada pela confiança!! Vou dar tudo de mim 🧡"),
        (posts[0], davi, "Elenco forte, hein! Sucesso pro projeto."),
        (posts[1], ana, "Quero ver esse episódio prontooo"),
        (posts[4], ana, "Você merece, sua voz é linda!"),
        (posts[5], gabi, "Confirmo, fiz isso e o ruído sumiu."),
        (posts[6], carla, "Essa frase merecia estar na HQ."),
        (posts[7], felipe, "A que sobrou é boa pelo menos?"),
    ]
    for post, autor, texto in COMENTARIOS:
        c = Comment.objects.create(update=post, author=autor, conteudo=texto)
        if autor != post.author:
            notify(post.author, Notification.Verb.NOVO_COMENTARIO, target=c)

    for post in posts:
        for u in random.sample(usuarios, random.randint(1, 5)):
            Like.objects.get_or_create(update=post, user=u)

    # ---------- episodios ----------
    Episode.objects.create(project=cafe, numero=1, titulo="O Espresso Assombrado", link="https://youtube.com/watch?v=cafe-ep1")
    Episode.objects.create(project=cavaleiros, numero=1, titulo="O Vento Desperta (redub)", link="https://youtube.com/watch?v=cav-ep1")

    # ---------- follows ----------
    SEGUE = [(gabi, ana), (davi, ana), (elisa, beto), (ana, gabi), (hugo, carla), (felipe, beto), (carla, hugo), (beto, elisa), (ana, davi), (gabi, davi)]
    for seguidor, seguido in SEGUE:
        f = Follow.objects.create(follower=seguidor, followed=seguido)
        notify(seguido, Notification.Verb.NOVO_SEGUIDOR, target=f)

    # ---------- mensagens ----------
    CONVERSAS = [
        (gabi, ana, "Oi Ana! Que horas é a leitura de sábado mesmo?"),
        (ana, gabi, "19h no Discord do projeto! Te mando o link."),
        (gabi, ana, "Perfeito, estarei lá! 🧡"),
        (davi, beto, "Beto, ainda dá tempo de fazer teste pro Kaito?"),
        (beto, davi, "Dá sim! Manda até domingo."),
        (hugo, carla, "Carla, li O Último Farol. Que roteiro lindo, parabéns."),
        (carla, hugo, "Hugo!! Vindo de você isso vale muito 🥹"),
    ]
    for remetente, destinatario, texto in CONVERSAS:
        m = Message.objects.create(sender=remetente, recipient=destinatario, conteudo=texto)
        notify(destinatario, Notification.Verb.NOVA_MENSAGEM, target=m)

    # ---------- avaliacoes ----------
    def avaliar(rater, alvo, score, reason=""):
        ct = ContentType.objects.get_for_model(type(alvo))
        Rating.objects.create(rater=rater, target_content_type=ct, target_object_id=alvo.id, score=score, reason=reason)

    avaliar(gabi, ana, 5)
    avaliar(davi, ana, 5)
    avaliar(ana, gabi, 5)
    avaliar(elisa, beto, 4)
    avaliar(hugo, carla, 5)
    avaliar(gabi, aurora, 5)
    avaliar(davi, cavaleiros, 4)
    avaliar(ana, farol, 5)
    avaliar(felipe, cafe, 4)

    print(f"Seed aplicado: {User.objects.count()} usuarios, {Project.objects.count()} projetos, "
          f"{ProjectVaga.objects.count()} vagas, {ProjectUpdate.objects.count()} posts, "
          f"{Message.objects.count()} mensagens, {Notification.objects.count()} notificacoes.")
    print("Senha de todos: dublacon123 (ex: ana.voz@example.com)")
