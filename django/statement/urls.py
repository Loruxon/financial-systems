from django.urls import path
from statement import views

urlpatterns = [
    path('admin/incoming-payments/', views.AdminIncomingPaymentListView.as_view(), name='admin-incoming-payment-list'),
    path('admin/incoming-payments/bulk/', views.AdminIncomingPaymentBulkCreateView.as_view(), name='admin-incoming-payment-bulk'),
    path('admin/incoming-payments/<int:pk>/', views.AdminIncomingPaymentDetailView.as_view(), name='admin-incoming-payment-detail'),
    path('admin/transfers/', views.AdminBankTransferListView.as_view(), name='admin-transfer-list'),
    path('admin/transfers/<int:pk>/', views.AdminBankTransferDetailView.as_view(), name='admin-transfer-detail'),
    path('statement/', views.StatementListView.as_view(), name='statement'),
    path('balance/', views.BalanceDetailView.as_view(), name='balance'),
    path('receipts/', views.ReceiptListView.as_view(), name='receipt-list'),
]
