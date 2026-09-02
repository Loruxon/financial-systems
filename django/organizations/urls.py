from django.urls import path
from . import views

urlpatterns = [
    path('organization/', views.OrganizationDetailView.as_view(), name='organization-detail'),
    path('counterparties/', views.CounterpartyListView.as_view(), name='counterparty-list'),
    path('counterparties/<int:pk>/', views.CounterpartyDetailView.as_view(), name='counterparty-detail'),
    path('counterparties/<int:counterparty_pk>/banks/', views.BankListView.as_view(), name='bank-list'),
    path('banks/<int:pk>/', views.BankDetailView.as_view(), name='bank-detail'),
    path('recipients/', views.RecipientListView.as_view(), name='recipient-list'),
    path('payers/', views.PayerListView.as_view(), name='payer-list'),
]
