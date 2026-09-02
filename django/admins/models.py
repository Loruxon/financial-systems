from django.db import models


class AdminUser(models.Model):
    logto_id = models.CharField(max_length=255, unique=True, verbose_name='Logto ID')
    name = models.CharField(max_length=255, blank=True, verbose_name='Имя')
    email = models.EmailField(blank=True, verbose_name='Email')

    def __str__(self):
        return self.name or self.email or self.logto_id

    class Meta:
        db_table = 'admin_users'
        verbose_name = 'Администратор'
        verbose_name_plural = 'Администраторы'
