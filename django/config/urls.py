from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/', include('organizations.urls')),
    path('api/', include('requests.urls')),
    path('api/', include('rates.urls')),
    path('api/', include('admins.urls')),
    path('api/', include('statement.urls')),
    path('api/', include('outgoing_payments.urls')),
]