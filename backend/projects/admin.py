from django.contrib import admin

from .models import Application, Comment, Episode, Like, Project, ProjectUpdate, ProjectVaga

admin.site.register(Project)
admin.site.register(ProjectVaga)
admin.site.register(Application)
admin.site.register(ProjectUpdate)
admin.site.register(Episode)
admin.site.register(Comment)
admin.site.register(Like)
