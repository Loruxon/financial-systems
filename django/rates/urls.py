from django.urls import path
from rates import views

urlpatterns = [
    path('rates/', views.ExchangeRateListView.as_view(), name='rate-list'),
    path('rates/latest/', views.ExchangeRateLatestView.as_view(), name='rate-latest'),
    path('rates/live/', views.ExchangeRateLiveView.as_view(), name='rate-live'),
    path('rates/<str:date>/', views.ExchangeRateDetailView.as_view(), name='rate-detail'),
]
