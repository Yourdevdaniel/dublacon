from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Role, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    ordering = ["email"]
    list_display = ["email", "nome", "is_staff", "is_active"]
    search_fields = ["email", "nome"]
    readonly_fields = ["cpf_hash", "date_joined"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dados pessoais", {"fields": ("nome", "cpf", "telefone", "foto", "bio", "roles")}),
        ("Permissoes", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Datas", {"fields": ("date_joined", "last_login")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "nome", "cpf", "password1", "password2")}),
    )
    filter_horizontal = ["roles", "groups", "user_permissions"]


admin.site.register(Role)
