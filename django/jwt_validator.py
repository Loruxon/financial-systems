import jwt
from jwt import PyJWKClient
from typing import Dict, Any
from auth_core import AuthInfo, AuthorizationError, JWKS_URI, ISSUER

jwks_client = PyJWKClient(JWKS_URI)

def validate_jwt(token: str) -> Dict[str, Any]:
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256', 'ES384'],
            issuer=ISSUER,
            options={'verify_aud': False},
        )
        verify_payload(payload)
        return payload

    except jwt.InvalidTokenError as e:
        raise AuthorizationError(f'Invalid token: {str(e)}', 401)
    except AuthorizationError:
        raise
    except Exception as e:
        raise AuthorizationError(f'Token validation failed: {str(e)}', 401)


def verify_payload(payload: Dict[str, Any]) -> None:
    aud = payload.get('aud', [])
    if isinstance(aud, str):
        aud = [aud]

    # Organization (non-API) model: aud = urn:logto:organization:<id>
    org_urn = next((a for a in aud if a.startswith('urn:logto:organization:')), None)
    # Organization-level API model: aud = API resource + organization_id claim
    has_resource_aud = 'https://api.board.fbridge.pro' in aud

    if not org_urn and not has_resource_aud:
        raise AuthorizationError('Invalid audience')

    # Extract org_id from claim or from URN
    org_id = payload.get('organization_id')
    if not org_id and org_urn:
        org_id = org_urn.replace('urn:logto:organization:', '')
        payload['organization_id'] = org_id

    if not org_id:
        raise AuthorizationError('Organization context required')

    # Admin org ID match or organization_roles containing "admin"
    from django.conf import settings
    admin_org_id = getattr(settings, 'ADMIN_ORGANIZATION_ID', '')
    if (admin_org_id and org_id == admin_org_id) or 'admin' in payload.get('organization_roles', []):
        payload['is_admin'] = True


def create_auth_info(payload: Dict[str, Any]) -> AuthInfo:
    scopes = payload.get('scope', '').split(' ') if payload.get('scope') else []
    audience = payload.get('aud', [])
    if isinstance(audience, str):
        audience = [audience]

    return AuthInfo(
        sub=payload.get('sub'),
        client_id=payload.get('client_id'),
        organization_id=payload.get('organization_id'),
        scopes=scopes,
        audience=audience,
        organization_roles=payload.get('organization_roles', []),
        is_admin=payload.get('is_admin', False),
    )
