JWKS_URI = 'http://logto:3001/oidc/jwks'
ISSUER = 'https://auth.board.fbridge.pro/oidc'

class AuthInfo:
    def __init__(self, sub: str, client_id: str = None, organization_id: str = None,
                 scopes: list = None, audience: list = None, organization_roles: list = None,
                 is_admin: bool = False):
        self.sub = sub
        self.client_id = client_id
        self.organization_id = organization_id
        self.scopes = scopes or []
        self.audience = audience or []
        self.organization_roles = organization_roles or []
        self.is_admin = is_admin

    def to_dict(self):
        return {
            'sub': self.sub,
            'client_id': self.client_id,
            'organization_id': self.organization_id,
            'scopes': self.scopes,
            'audience': self.audience,
            'organization_roles': self.organization_roles,
            'is_admin': self.is_admin,
        }

class AuthorizationError(Exception):
    def __init__(self, message: str, status: int = 403):
        self.message = message
        self.status = status
        super().__init__(self.message)