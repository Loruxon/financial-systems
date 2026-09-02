from django.urls import path
from admins.views import (
    AdminUserListView, AdminRequestListView, AdminRequestDetailView, AdminPayerListView,
    AdminDocumentListView, AdminDocumentDetailView, AdminWorkSchemeListView,
    AdminOrganizationBalanceListView, AdminRecipientBalanceListView,
)

urlpatterns = [
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/requests/', AdminRequestListView.as_view(), name='admin-request-list'),
    path('admin/requests/<int:pk>/', AdminRequestDetailView.as_view(), name='admin-request-detail'),
    path('admin/requests/<int:pk>/documents/', AdminDocumentListView.as_view(), name='admin-document-list'),
    path('admin/documents/<int:pk>/', AdminDocumentDetailView.as_view(), name='admin-document-detail'),
    path('admin/payers/', AdminPayerListView.as_view(), name='admin-payer-list'),
    path('admin/schemes/', AdminWorkSchemeListView.as_view(), name='admin-scheme-list'),
    path('admin/organization-balances/', AdminOrganizationBalanceListView.as_view(), name='admin-organization-balance-list'),
    path('admin/recipient-balances/', AdminRecipientBalanceListView.as_view(), name='admin-recipient-balance-list'),
]
