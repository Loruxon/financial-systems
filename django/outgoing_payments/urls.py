from django.urls import path
from outgoing_payments import views

urlpatterns = [
    path('admin/outgoing-payments/', views.OutgoingPaymentListView.as_view(), name='admin-outgoing-payment-list'),
    path('admin/outgoing-payments/<int:pk>/', views.OutgoingPaymentDetailView.as_view(), name='admin-outgoing-payment-detail'),
    path('admin/outgoing-payments/<int:pk>/documents/', views.OutgoingPaymentDocumentListView.as_view(), name='admin-outgoing-payment-document-list'),
    path('admin/outgoing-payment-documents/<int:pk>/', views.OutgoingPaymentDocumentDetailView.as_view(), name='admin-outgoing-payment-document-detail'),
]
