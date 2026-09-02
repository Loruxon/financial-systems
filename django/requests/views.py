from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser
from requests.serializers import (
    RequestListSerializer, RequestSerializer, RequestSubmitSerializer, RequestDraftSerializer,
    DocumentSerializer,
)
from requests.models import Request, Document
from auth_middleware import AccessTokenAuthentication
from common import get_organization


def org_can_edit_documents(req, section):
    """Может ли организация загружать/удалять файлы в данном блоке при текущем статусе заявки."""
    if section == Document.SECTION_PAYMENT:
        if req.status in (Request.DRAFT, Request.NEW):
            return True
        return req.status == Request.CORRECTION and req.edit_documents
    if section == Document.SECTION_CLOSING:
        if req.status == Request.AWAITING_CLOSING_DOCS:
            return True
        return req.status == Request.CORRECTION and req.edit_closing_docs
    return False


class RequestListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        org = get_organization(request)
        qs = org.requests.all()
        return Response(RequestListSerializer(qs, many=True).data)

    def post(self, request):
        org = get_organization(request)
        if not request.data:
            serializer = RequestDraftSerializer(data={})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save(organization=org)
            return Response(RequestSerializer(instance).data, status=status.HTTP_201_CREATED)
        serializer = RequestSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(organization=org)
        return Response(RequestSerializer(instance).data, status=status.HTTP_201_CREATED)


class RequestDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get_object(self, request, pk):
        org = get_organization(request)
        return org.requests.get(pk=pk)

    def get(self, request, pk):
        instance = self.get_object(request, pk)
        return Response(RequestSerializer(instance).data)

    def patch(self, request, pk):
        instance = self.get_object(request, pk)
        serializer = RequestSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RequestDocumentListView(APIView):
    authentication_classes = [AccessTokenAuthentication]
    parser_classes = [MultiPartParser]

    def get_request_instance(self, request, pk):
        org = get_organization(request)
        try:
            return org.requests.get(pk=pk)
        except Request.DoesNotExist:
            raise NotFound('Request not found')

    def get(self, request, pk):
        req = self.get_request_instance(request, pk)
        qs = req.documents.all()
        section = request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        return Response(DocumentSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request, pk):
        req = self.get_request_instance(request, pk)
        section = request.data.get('section')
        if section not in (Document.SECTION_PAYMENT, Document.SECTION_CLOSING):
            raise ValidationError({'section': 'Некорректный блок'})
        if not org_can_edit_documents(req, section):
            raise PermissionDenied('Загрузка недоступна для текущего статуса заявки')

        serializer = DocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(request=req, uploaded_by_admin=False)
        return Response(DocumentSerializer(doc, context={'request': request}).data, status=status.HTTP_201_CREATED)


class RequestDocumentDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get_object(self, request, pk, doc_id):
        org = get_organization(request)
        try:
            req = org.requests.get(pk=pk)
        except Request.DoesNotExist:
            raise NotFound('Request not found')
        try:
            return req.documents.get(pk=doc_id)
        except Document.DoesNotExist:
            raise NotFound('Document not found')

    def delete(self, request, pk, doc_id):
        doc = self.get_object(request, pk, doc_id)
        if not org_can_edit_documents(doc.request, doc.section):
            raise PermissionDenied('Удаление недоступно для текущего статуса заявки')
        doc.file.delete(save=False)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
