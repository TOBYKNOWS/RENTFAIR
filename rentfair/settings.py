import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import cloudinary

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


def load_local_env():
    if os.getenv('SKIP_DOTENV', '').strip().lower() in {'1', 'true', 'yes', 'on'}:
        return

    env_path = BASE_DIR / '.env'
    if not env_path.exists():
        return
        
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_local_env()


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name, default=''):
    return [item.strip() for item in os.getenv(name, default).split(',') if item.strip()]


def database_from_url(url):
    parsed = urlparse(url)
    scheme = parsed.scheme.replace('postgres://', 'postgresql://', 1)
    engine_by_scheme = {
        'postgres': 'django.db.backends.postgresql',
        'postgresql': 'django.db.backends.postgresql',
        'mysql': 'django.db.backends.mysql',
        'mysql2': 'django.db.backends.mysql',
        'sqlite': 'django.db.backends.sqlite3',
        'sqlite3': 'django.db.backends.sqlite3',
    }
    engine = engine_by_scheme.get(scheme)
    if not engine:
        raise ValueError(f'Unsupported DATABASE_URL scheme: {parsed.scheme}')

    if engine == 'django.db.backends.sqlite3':
        return {
            'ENGINE': engine,
            'NAME': unquote(parsed.path.lstrip('/')) or BASE_DIR / 'db.sqlite3',
        }

    query = parse_qs(parsed.query)
    options = {}
    sslmode = os.getenv('DB_SSLMODE') or query.get('sslmode', [None])[0]
    if sslmode and engine == 'django.db.backends.postgresql':
        options['sslmode'] = sslmode

    database = {
        'ENGINE': engine,
        'NAME': unquote(parsed.path.lstrip('/')),
        'USER': unquote(parsed.username or ''),
        'PASSWORD': unquote(parsed.password or ''),
        'HOST': parsed.hostname or '',
        'PORT': str(parsed.port or ''),
        'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', '600')),
    }
    if options:
        database['OPTIONS'] = options
    return database


# Production values should be provided by the hosting platform.
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'rentfair-local-fallback-key-change-this-before-public-deployment-2026',
)

DEBUG = env_bool('DEBUG', False)
TESTING = 'test' in sys.argv

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1]')
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')


# Application definition



INSTALLED_APPS = [
    'core',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'cloudinary',
]




MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'rentfair.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'rentfair.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASE_URL = os.getenv('DATABASE_URL')

if TESTING:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'test.sqlite3',
        }
    }
elif DATABASE_URL:
    DATABASES = {
        'default': database_from_url(DATABASE_URL),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME', 'rentfair'),
            'USER': os.getenv('DB_USER', 'root'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            },
        }
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

# STATIC FILES / MEDIA CONFIG

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

CLOUDINARY_URL = os.getenv('CLOUDINARY_URL', '').strip()
if CLOUDINARY_URL:
    parsed_cloudinary_url = urlparse(CLOUDINARY_URL)
    if parsed_cloudinary_url.scheme != 'cloudinary':
        raise ValueError("Invalid CLOUDINARY_URL scheme. Expected 'cloudinary://'.")

    cloudinary.config(
        cloud_name=parsed_cloudinary_url.hostname,
        api_key=unquote(parsed_cloudinary_url.username or ''),
        api_secret=unquote(parsed_cloudinary_url.password or ''),
        secure=True,
    )

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },

    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Production security. Set DEBUG=True locally to disable these browser-facing
# HTTPS requirements during local development.
SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', not DEBUG and not TESTING)
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', not DEBUG and not TESTING)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', not DEBUG and not TESTING)
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000' if not DEBUG and not TESTING else '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', not DEBUG and not TESTING)
SECURE_HSTS_PRELOAD = env_bool('SECURE_HSTS_PRELOAD', not DEBUG and not TESTING)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
