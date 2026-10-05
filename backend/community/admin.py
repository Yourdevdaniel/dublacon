from django.contrib import admin

from .models import BugReport, Message, Notification, Rating, Report, ReportEvidence

admin.site.register(Report)
admin.site.register(ReportEvidence)
admin.site.register(BugReport)
admin.site.register(Message)
admin.site.register(Notification)
admin.site.register(Rating)
