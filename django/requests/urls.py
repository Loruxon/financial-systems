from django.urls import path
from . import views

urlpatterns = [
    path('requests/', views.RequestListView.as_view(), name='request-list'),
    path('requests/<int:pk>/', views.RequestDetailView.as_view(), name='request-detail'),
    path('requests/<int:pk>/documents/', views.RequestDocumentListView.as_view(), name='request-document-list'),
    path('requests/<int:pk>/documents/<int:doc_id>/', views.RequestDocumentDetailView.as_view(), name='request-document-detail'),
]
