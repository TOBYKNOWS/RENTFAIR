import json
import os
import secrets
import sys
from datetime import timedelta

import cloudinary.uploader
from django.conf import settings
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.db.models import F
from django.db.models import Count
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods, require_POST

from .models import (
    Area,
    ContactMessage,
    EmailVerificationToken,
    Enquiry,
    Favourite,
    ListingReport,
    PlatformSetting,
    Property,
    PropertyImage,
    UserProfile,
)


def staff_required_json(request):
    if request.user.is_authenticated and request.user.is_staff:
        return None
    return JsonResponse({'error': 'Admin login required.'}, status=403)


def platform_settings_payload(settings_obj, user=None):
    payload = {
        'allowNewUserRegistrations': settings_obj.allow_new_user_registrations,
        'enableListingSubmissions': settings_obj.enable_listing_submissions,
        'requireEmailVerification': settings_obj.require_email_verification,
        'maintenanceMode': settings_obj.maintenance_mode,
        'autoApproveVerifiedOwners': settings_obj.auto_approve_verified_owners,
        'requireDocumentUpload': settings_obj.require_document_upload,
        'enableFairPriceIndicator': settings_obj.enable_fair_price_indicator,
        'showViewCountsPublicly': settings_obj.show_view_counts_publicly,
        'rentalCoverage': settings_obj.rental_coverage,
        'buyLandCoverage': settings_obj.buy_land_coverage,
    }

    if user and user.is_authenticated:
        payload.update({
            'adminName': user.get_full_name() or user.username,
            'adminEmail': user.email,
        })

    return payload


@ensure_csrf_cookie
def home(request):
    return render(request, 'index.html')


@ensure_csrf_cookie
def property_detail(request, slug):
    return render(request, 'index.html')


def media_url(request, file_field, fallback=''):
    if file_field:
        url = file_field.url
        if url.startswith(('http://', 'https://', '//')):
            return url
        if url.startswith(settings.MEDIA_URL) and not settings.DEBUG:
            return fallback
        return url
    return fallback


def property_main_image_url(request, property_obj):
    return media_url(request, property_obj.main_image, property_obj.main_image_url)


def property_gallery_urls(request, property_obj):
    return [item['url'] for item in property_gallery_items(request, property_obj)]


def property_gallery_items(request, property_obj):
    items = []
    for image in property_obj.images.all():
        url = media_url(request, image.image, image.image_url)
        if url:
            items.append({
                'url': url,
                'caption': image.caption,
            })
    return items


def property_display_image_url(request, property_obj):
    main_url = property_main_image_url(request, property_obj)
    if main_url:
        return main_url

    gallery_urls = property_gallery_urls(request, property_obj)
    return gallery_urls[0] if gallery_urls else ''


def fair_price_payload(property_obj, settings_obj=None):
    settings_obj = settings_obj or PlatformSetting.load()
    if not settings_obj.enable_fair_price_indicator:
        return {'label': '', 'insight': ''}

    if (
        property_obj.listing_type == Property.ListingType.RENT
        and property_obj.area.average_rent
        and property_obj.area.average_rent > 0
    ):
        average = property_obj.area.average_rent
        difference_percent = ((property_obj.price - average) / average) * 100
        percentage = round(abs(difference_percent))
        area_name = property_obj.area.name

        if difference_percent <= -10:
            return {
                'label': 'Below area average',
                'insight': f'{percentage}% below {area_name} avg',
            }
        if difference_percent <= 10:
            return {
                'label': 'Fair price',
                'insight': f'In line with {area_name} avg',
            }
        return {
            'label': 'Above area average',
            'insight': f'{percentage}% above {area_name} avg',
        }

    if property_obj.fair_price_note:
        return {
            'label': property_obj.fair_price_note,
            'insight': property_obj.fair_price_note,
        }

    return {'label': '', 'insight': ''}


def owner_trust_payload(property_obj):
    profile = getattr(property_obj.owner, 'profile', None) if property_obj.owner else None
    owner_verified = (
        bool(profile)
        and profile.verification_status == UserProfile.VerificationStatus.VERIFIED
    )
    role = profile.role if profile else ''
    role_label = profile.get_role_display() if profile else 'Property Contact'
    role_badges = {
        UserProfile.Role.LANDLORD: 'Verified owner',
        UserProfile.Role.AGENT: 'Verified agent',
        UserProfile.Role.DEVELOPER: 'Verified developer',
    }
    owner_badge = role_badges.get(role, 'Verified contact') if owner_verified else ''
    listing_verified = property_obj.verification_status == Property.VerificationStatus.VERIFIED
    document_checked = bool((property_obj.verification_document or property_obj.verification_document_url) and listing_verified)

    badges = []
    if owner_badge:
        badges.append(owner_badge)
    if listing_verified:
        badges.append('Listing reviewed')
    if document_checked:
        badges.append('Document checked')

    return {
        'ownerVerified': owner_verified,
        'ownerRole': role,
        'ownerRoleLabel': role_label,
        'ownerBadge': owner_badge,
        'listingReviewed': listing_verified,
        'documentChecked': document_checked,
        'badges': badges,
    }


def property_api_payload(request, property_obj, settings_obj=None):
    settings_obj = settings_obj or PlatformSetting.load()
    fair_price = fair_price_payload(property_obj, settings_obj)
    gallery_items = property_gallery_items(request, property_obj)
    trust = owner_trust_payload(property_obj)
    return {
        'id': property_obj.id,
        'slug': property_obj.slug,
        'type': property_obj.listing_type,
        'category': property_obj.property_type,
        'title': property_obj.title,
        'location': str(property_obj.area),
        'areaName': property_obj.area.name,
        'city': property_obj.area.city,
        'state': property_obj.area.state,
        'address': property_obj.address,
        'price': property_obj.price,
        'unit': property_obj.price_suffix,
        'beds': property_obj.bedrooms,
        'baths': property_obj.bathrooms,
        'size': property_obj.size,
        'description': property_obj.description,
        'features': [
            feature.strip()
            for feature in property_obj.features.splitlines()
            if feature.strip()
        ],
        'docs': ['Verification document'] if property_obj.verification_document or property_obj.verification_document_url else [],
        'trust': trust,
        'fairLabel': fair_price['label'],
        'fairInsight': fair_price['insight'],
        'verified': property_obj.verification_status == Property.VerificationStatus.VERIFIED,
        'featured': property_obj.is_featured,
        'views': property_obj.view_count if settings_obj.show_view_counts_publicly else None,
        'img': property_display_image_url(request, property_obj),
        'images': [item['url'] for item in gallery_items],
        'imageItems': gallery_items,
        'owner': {
            'name': property_obj.owner_name,
            'phone': property_obj.owner_phone,
            'whatsapp': property_obj.owner_whatsapp,
            'email': property_obj.owner_email,
            'role': trust['ownerRoleLabel'],
            'verified': trust['ownerVerified'],
            'badge': trust['ownerBadge'],
        },
    }


def property_list_api(request):
    listing_type = request.GET.get('type')
    settings_obj = PlatformSetting.load()
    properties = Property.objects.select_related('area', 'owner__profile').prefetch_related('images').filter(status=Property.Status.PUBLISHED)

    if listing_type in Property.ListingType.values:
        properties = properties.filter(listing_type=listing_type)

    data = [property_api_payload(request, property_obj, settings_obj) for property_obj in properties]

    return JsonResponse({'properties': data})


@require_POST
def property_view_api(request, property_id):
    try:
        property_obj = Property.objects.get(id=property_id, status=Property.Status.PUBLISHED)
    except Property.DoesNotExist:
        return JsonResponse({'error': 'Property not found.'}, status=404)

    session_key = f'viewed_property_{property_obj.id}'
    counted = not request.session.get(session_key)

    if counted:
        Property.objects.filter(id=property_obj.id).update(view_count=F('view_count') + 1)
        request.session[session_key] = True
        property_obj.refresh_from_db(fields=['view_count'])

    settings_obj = PlatformSetting.load()
    return JsonResponse({
        'counted': counted,
        'views': property_obj.view_count if settings_obj.show_view_counts_publicly else None,
    })


@require_POST
def property_whatsapp_click_api(request, property_id):
    try:
        property_obj = Property.objects.get(id=property_id, status=Property.Status.PUBLISHED)
    except Property.DoesNotExist:
        return JsonResponse({'error': 'Property not found.'}, status=404)

    Property.objects.filter(id=property_obj.id).update(whatsapp_click_count=F('whatsapp_click_count') + 1)
    property_obj.refresh_from_db(fields=['whatsapp_click_count'])

    return JsonResponse({
        'counted': True,
        'whatsappClicks': property_obj.whatsapp_click_count,
    })


def unique_property_slug(title):
    base_slug = slugify(title) or 'property'
    slug = base_slug
    counter = 2

    while Property.objects.filter(slug=slug).exists():
        slug = f'{base_slug}-{counter}'
        counter += 1

    return slug


def positive_int_or_none(value):
    if value in [None, '', 'Studio']:
        return None

    value = str(value).replace('+', '').strip()
    return int(value) if value.isdigit() else None


def validate_property_images(images):
    allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
    max_size = 5 * 1024 * 1024

    for image in images:
        if image.size > max_size:
            return f'{image.name} is larger than 5MB.'
        if image.content_type not in allowed_types:
            return 'Please upload JPG, PNG, or WEBP images only.'

    return ''


def validate_verification_document(document):
    if not document:
        return ''

    allowed_types = {'application/pdf', 'image/jpeg', 'image/png', 'image/webp'}
    max_size = 10 * 1024 * 1024

    if document.size > max_size:
        return f'{document.name} is larger than 10MB.'
    if document.content_type not in allowed_types:
        return 'Please upload a PDF, JPG, PNG, or WEBP document.'

    return ''


def should_upload_media_to_cloudinary():
    cloudinary_url = os.getenv('CLOUDINARY_URL', '').strip()
    return (
        bool(cloudinary_url)
        and cloudinary_url.startswith('cloudinary://')
        and not settings.TESTING
    )


def upload_media_to_cloudinary(uploaded_file, folder, resource_type='image'):
    if not uploaded_file:
        return ''

    if not should_upload_media_to_cloudinary():
        return ''

    if hasattr(uploaded_file, 'seekable') and uploaded_file.seekable():
        uploaded_file.seek(0)

    result = cloudinary.uploader.upload(
        uploaded_file,
        folder=folder,
        resource_type=resource_type,
        use_filename=True,
        unique_filename=True,
        overwrite=False,
    )
    url = result.get('secure_url') or result.get('url') or ''
    if not url:
        raise ValueError('Cloudinary upload did not return a URL.')
    return url


def payload_list(payload, key):
    if hasattr(payload, 'getlist'):
        return payload.getlist(key)

    value = payload.get(key, [])
    return value if isinstance(value, list) else [value]


def clean_gallery_image_urls(payload, limit=9):
    urls = []
    for value in payload_list(payload, 'gallery_image_urls'):
        for url in str(value or '').replace(',', '\n').splitlines():
            url = url.strip()
            if url and url not in urls:
                urls.append(url)
            if len(urls) >= limit:
                return urls
    return urls


def rental_state_allowed(settings_obj, state):
    states = coverage_states(settings_obj.rental_coverage)
    return states is None or str(state).strip().lower() in states


def coverage_states(coverage):
    states_by_coverage = {
        PlatformSetting.RentalCoverage.EKITI: {'ekiti'},
        PlatformSetting.RentalCoverage.EKITI_ONDO: {'ekiti', 'ondo'},
        PlatformSetting.RentalCoverage.SOUTH_WEST: {'ekiti', 'ondo', 'osun', 'oyo', 'ogun', 'lagos'},
        PlatformSetting.RentalCoverage.NATIONWIDE: None,
    }
    return states_by_coverage.get(coverage)


def buy_land_state_allowed(settings_obj, state):
    if settings_obj.buy_land_coverage == PlatformSetting.BuyLandCoverage.NATIONWIDE:
        return True

    selected_states = coverage_states(settings_obj.rental_coverage)
    return selected_states is None or str(state).strip().lower() in selected_states


def should_auto_approve_listing(settings_obj, user, payload, main_image=None, gallery_images=None):
    if not settings_obj.auto_approve_verified_owners:
        return False

    profile = getattr(user, 'profile', None)
    if not profile or profile.verification_status != UserProfile.VerificationStatus.VERIFIED:
        return False

    description = str(payload.get('description', '')).strip()
    has_photo = bool(
        main_image
        or gallery_images
        or str(payload.get('main_image_url', '')).strip()
        or clean_gallery_image_urls(payload)
    )
    has_contact = bool(str(payload.get('owner_phone', '')).strip())
    has_required_content = all(
        str(payload.get(field, '')).strip()
        for field in ['title', 'listing_type', 'state', 'area', 'price', 'property_type']
    )

    return has_required_content and has_contact and has_photo and len(description) >= 40


@require_POST
def property_submit_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please log in before posting a property.'}, status=403)

    settings_obj = PlatformSetting.load()
    if settings_obj.maintenance_mode:
        return JsonResponse({'error': 'Listing submissions are temporarily unavailable during maintenance.'}, status=503)
    if not settings_obj.enable_listing_submissions:
        return JsonResponse({'error': 'Listing submissions are currently disabled.'}, status=403)

    is_upload = request.content_type.startswith('multipart/form-data')
    main_image = None
    gallery_images = []
    verification_document = None

    if is_upload:
        payload = request.POST
        main_image = request.FILES.get('main_image')
        gallery_images = request.FILES.getlist('images')[:9]
        verification_document = request.FILES.get('verification_document')
        image_error = validate_property_images([image for image in [main_image, *gallery_images] if image])
        if image_error:
            return JsonResponse({'error': image_error}, status=400)
        document_error = validate_verification_document(verification_document)
        if document_error:
            return JsonResponse({'error': document_error}, status=400)
    else:
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    required_fields = ['title', 'listing_type', 'state', 'area', 'price', 'property_type', 'description', 'owner_name', 'owner_phone']
    missing_fields = [field for field in required_fields if not str(payload.get(field, '')).strip()]
    if missing_fields:
        return JsonResponse({
            'error': 'Please fill all required fields.',
            'missing_fields': missing_fields,
        }, status=400)

    listing_type = str(payload['listing_type']).lower()
    if listing_type not in Property.ListingType.values:
        return JsonResponse({'error': 'Invalid listing type.'}, status=400)

    if listing_type == Property.ListingType.RENT and not rental_state_allowed(settings_obj, payload['state']):
        return JsonResponse({'error': 'Rental listings are not currently enabled for this state.'}, status=400)
    if listing_type in [Property.ListingType.BUY, Property.ListingType.LAND] and not buy_land_state_allowed(settings_obj, payload['state']):
        return JsonResponse({'error': 'Buy and land listings are not currently enabled for this state.'}, status=400)

    if settings_obj.require_document_upload and not verification_document:
        return JsonResponse({'error': 'Please upload a verification document for this listing.'}, status=400)

    try:
        price = int(payload['price'])
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Price must be a valid number.'}, status=400)

    if price <= 0:
        return JsonResponse({'error': 'Price must be greater than zero.'}, status=400)

    area, _ = Area.objects.get_or_create(
        name=str(payload['area']).strip(),
        defaults={
            'city': str(payload.get('city') or payload['area']).strip(),
            'state': str(payload['state']).strip(),
            'country': 'Nigeria',
        },
    )

    title = str(payload['title']).strip()
    price_suffix = '/year' if listing_type == Property.ListingType.RENT else ''
    gallery_image_urls = clean_gallery_image_urls(payload)
    auto_approve = should_auto_approve_listing(settings_obj, request.user, payload, main_image, gallery_images)
    uploaded_main_image_url = ''
    uploaded_gallery_image_urls = []
    uploaded_verification_document_url = ''

    if should_upload_media_to_cloudinary():
        try:
            uploaded_main_image_url = upload_media_to_cloudinary(
                main_image,
                'rentfair/properties/main',
                resource_type='image',
            )
            uploaded_gallery_image_urls = [
                upload_media_to_cloudinary(
                    image_file,
                    'rentfair/properties/gallery',
                    resource_type='image',
                )
                for image_file in gallery_images
            ]
            uploaded_gallery_image_urls = [url for url in uploaded_gallery_image_urls if url]
            uploaded_verification_document_url = upload_media_to_cloudinary(
                verification_document,
                'rentfair/properties/documents',
                resource_type='auto',
            )
        except Exception:
            return JsonResponse({'error': 'Could not upload media. Please try again.'}, status=502)

        main_image = None if uploaded_main_image_url else main_image
        gallery_images = [] if uploaded_gallery_image_urls else gallery_images
        verification_document = None if uploaded_verification_document_url else verification_document

    initial_verification_status = (
        Property.VerificationStatus.VERIFIED
        if auto_approve
        else Property.VerificationStatus.PENDING
    )
    initial_status = Property.Status.PUBLISHED if auto_approve else Property.Status.DRAFT
    initial_published_at = timezone.now() if auto_approve else None

    try:
        property_obj = Property.objects.create(
            title=title,
            slug=unique_property_slug(title),
            listing_type=listing_type,
            property_type=str(payload['property_type']).strip(),
            area=area,
            address=str(payload.get('address', '')).strip(),
            price=price,
            price_suffix=price_suffix,
            bedrooms=positive_int_or_none(payload.get('bedrooms')),
            bathrooms=positive_int_or_none(payload.get('bathrooms')),
            size=str(payload.get('size', '')).strip(),
            description=str(payload['description']).strip(),
            features='\n'.join(payload.getlist('features') if is_upload else payload.get('features', [])),
            main_image=main_image,
            main_image_url=uploaded_main_image_url or str(payload.get('main_image_url', '')).strip(),
            verification_document=verification_document,
            verification_document_url=uploaded_verification_document_url,
            owner=request.user,
            owner_name=str(payload['owner_name']).strip(),
            owner_phone=str(payload['owner_phone']).strip(),
            owner_whatsapp=str(payload.get('owner_whatsapp', '')).strip(),
            owner_email=str(payload.get('owner_email', '')).strip(),
            verification_status=initial_verification_status,
            status=initial_status,
            published_at=initial_published_at,
        )
    except IntegrityError:
        return JsonResponse({'error': 'Could not save listing. Please try again.'}, status=500)

    for index, image_file in enumerate(gallery_images):
        PropertyImage.objects.create(
            property=property_obj,
            image=image_file,
            sort_order=index,
        )

    url_sort_offset = len(gallery_images)
    for index, image_url in enumerate([*uploaded_gallery_image_urls, *gallery_image_urls]):
        PropertyImage.objects.create(
            property=property_obj,
            image_url=image_url,
            sort_order=url_sort_offset + index,
        )

    return JsonResponse({
        'message': (
            'Property published automatically because your owner profile is verified.'
            if auto_approve
            else 'Property submitted for admin verification. It is not live yet.'
        ),
        'property': {
            'id': property_obj.id,
            'title': property_obj.title,
            'status': property_obj.status,
            'verification_status': property_obj.verification_status,
        },
    }, status=201)


def user_dashboard_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please log in to view your dashboard.'}, status=403)

    properties = Property.objects.select_related('area').prefetch_related('images').filter(owner=request.user)
    enquiries = Enquiry.objects.select_related('property').filter(property__owner=request.user)
    visible_enquiries = enquiries.exclude(status=Enquiry.Status.CLOSED)

    return JsonResponse({
        'stats': {
            'totalListings': properties.count(),
            'activeListings': properties.filter(status=Property.Status.PUBLISHED).count(),
            'pendingListings': properties.filter(status=Property.Status.DRAFT).count(),
            'enquiries': visible_enquiries.count(),
            'views': properties.aggregate(total=Sum('view_count'))['total'] or 0,
            'whatsappLeads': properties.aggregate(total=Sum('whatsapp_click_count'))['total'] or 0,
        },
        'listings': [
            {
                'id': property_obj.id,
                'title': property_obj.title,
                'location': str(property_obj.area),
                'price': property_obj.formatted_price,
                'rawType': property_obj.listing_type,
                'status': owner_property_status_label(property_obj),
                'canMarkUnavailable': property_obj.status == Property.Status.PUBLISHED,
                'views': property_obj.view_count,
                'whatsappLeads': property_obj.whatsapp_click_count,
                'reviewNote': property_obj.review_note,
                'img': property_display_image_url(request, property_obj) or 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120&q=60',
            }
            for property_obj in properties
        ],
        'enquiries': [
            {
                'id': enquiry.id,
                'propertyId': enquiry.property_id,
                'propertyTitle': enquiry.property.title,
                'name': enquiry.name,
                'phone': enquiry.phone,
                'email': enquiry.email,
                'message': enquiry.message or f'Interested in {enquiry.property.title}',
                'time': enquiry.created_at.strftime('%d %b'),
                'status': enquiry.status,
            }
            for enquiry in visible_enquiries.order_by('-created_at')[:8]
        ],
    })


def owner_property_status_label(property_obj):
    labels = {
        Property.Status.PUBLISHED: 'Active',
        Property.Status.DRAFT: 'Pending',
        Property.Status.FLAGGED: 'Flagged',
        Property.Status.SOLD: 'Sold',
        Property.Status.RENTED: 'Rented',
    }
    return labels.get(property_obj.status, 'Pending')


@require_POST
def owner_property_action_api(request, property_id, action):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please log in to manage your listing.'}, status=403)

    try:
        property_obj = Property.objects.get(id=property_id, owner=request.user)
    except Property.DoesNotExist:
        return JsonResponse({'error': 'Listing not found.'}, status=404)

    if property_obj.status != Property.Status.PUBLISHED:
        return JsonResponse({'error': 'Only active listings can be marked unavailable.'}, status=400)

    if action == 'mark_sold':
        if property_obj.listing_type == Property.ListingType.RENT:
            return JsonResponse({'error': 'Use rented for rental listings.'}, status=400)
        property_obj.status = Property.Status.SOLD
        message = 'Listing marked as sold. Admin can now see the update.'
    elif action == 'mark_rented':
        if property_obj.listing_type != Property.ListingType.RENT:
            return JsonResponse({'error': 'Use sold for buy and land listings.'}, status=400)
        property_obj.status = Property.Status.RENTED
        message = 'Listing marked as rented. Admin can now see the update.'
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    property_obj.save(update_fields=['status', 'updated_at'])

    return JsonResponse({
        'message': message,
        'property': {
            'id': property_obj.id,
            'status': owner_property_status_label(property_obj),
        },
    })


@require_POST
def owner_enquiry_action_api(request, enquiry_id, action):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please log in to manage enquiries.'}, status=403)

    try:
        enquiry = Enquiry.objects.select_related('property').get(
            id=enquiry_id,
            property__owner=request.user,
        )
    except Enquiry.DoesNotExist:
        return JsonResponse({'error': 'Enquiry not found.'}, status=404)

    if action == 'mark_contacted':
        enquiry.status = Enquiry.Status.CONTACTED
        message = 'Enquiry marked as contacted.'
    elif action == 'close':
        enquiry.status = Enquiry.Status.CLOSED
        message = 'Enquiry closed.'
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    enquiry.save(update_fields=['status', 'updated_at'])

    return JsonResponse({
        'message': message,
        'enquiry': {
            'id': enquiry.id,
            'status': enquiry.status,
        },
    })


@require_POST
def enquiry_submit_api(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    required_fields = ['property_id', 'name', 'phone']
    missing_fields = [field for field in required_fields if not str(payload.get(field, '')).strip()]
    if missing_fields:
        return JsonResponse({
            'error': 'Please enter your name and phone number.',
            'missing_fields': missing_fields,
        }, status=400)

    try:
        property_obj = Property.objects.get(id=payload['property_id'])
    except (Property.DoesNotExist, ValueError, TypeError):
        return JsonResponse({'error': 'Property not found.'}, status=404)

    enquiry = Enquiry.objects.create(
        property=property_obj,
        name=str(payload['name']).strip(),
        phone=str(payload['phone']).strip(),
        email=str(payload.get('email', '')).strip(),
        message=str(payload.get('message', '')).strip(),
    )

    return JsonResponse({
        'message': 'Enquiry submitted.',
        'enquiry': {
            'id': enquiry.id,
            'status': enquiry.status,
        },
    }, status=201)


@require_POST
def contact_submit_api(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    required_fields = ['name', 'email', 'subject', 'message']
    missing_fields = [field for field in required_fields if not str(payload.get(field, '')).strip()]
    if missing_fields:
        return JsonResponse({
            'error': 'Please fill all contact form fields.',
            'missing_fields': missing_fields,
        }, status=400)

    contact_message = ContactMessage.objects.create(
        name=str(payload['name']).strip(),
        email=str(payload['email']).strip(),
        subject=str(payload['subject']).strip(),
        message=str(payload['message']).strip(),
    )

    return JsonResponse({
        'message': 'Message sent.',
        'contact': {
            'id': contact_message.id,
            'status': contact_message.status,
        },
    }, status=201)


@require_POST
def listing_report_submit_api(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    required_fields = ['property_id', 'reason']
    missing_fields = [field for field in required_fields if not str(payload.get(field, '')).strip()]
    if missing_fields:
        return JsonResponse({
            'error': 'Please choose a reason for the report.',
            'missing_fields': missing_fields,
        }, status=400)

    try:
        property_obj = Property.objects.get(id=payload['property_id'])
    except (Property.DoesNotExist, ValueError, TypeError):
        return JsonResponse({'error': 'Property not found.'}, status=404)

    reason = str(payload['reason']).strip()
    severe_words = ['fraud', 'scam', 'payment', 'fake', 'unsafe']
    severity = (
        ListingReport.Severity.HIGH
        if any(word in reason.lower() for word in severe_words)
        else ListingReport.Severity.MEDIUM
    )

    report = ListingReport.objects.create(
        property=property_obj,
        reporter_name=str(payload.get('name', '')).strip(),
        reporter_email=str(payload.get('email', '')).strip(),
        reason=reason,
        severity=severity,
    )

    if severity == ListingReport.Severity.HIGH and property_obj.status not in [
        Property.Status.FLAGGED,
        Property.Status.SOLD,
        Property.Status.RENTED,
    ]:
        property_obj.status = Property.Status.FLAGGED
        property_obj.save(update_fields=['status', 'updated_at'])

    return JsonResponse({
        'message': 'Report submitted. This listing has been flagged for admin review.' if severity == ListingReport.Severity.HIGH else 'Report submitted.',
        'report': {
            'id': report.id,
            'status': report.status,
            'severity': report.severity,
        },
    }, status=201)


def favourites_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please log in to view saved properties.'}, status=403)

    settings_obj = PlatformSetting.load()
    favourites = Favourite.objects.select_related('property', 'property__area').filter(user=request.user)
    properties = [favourite.property for favourite in favourites if favourite.property.status == Property.Status.PUBLISHED]

    return JsonResponse({
        'ids': [str(property_obj.id) for property_obj in properties],
        'properties': [property_api_payload(request, property_obj, settings_obj) for property_obj in properties],
    })


@require_POST
def favourite_toggle_api(request, property_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Please log in to save properties.'}, status=403)

    try:
        property_obj = Property.objects.get(id=property_id, status=Property.Status.PUBLISHED)
    except Property.DoesNotExist:
        return JsonResponse({'error': 'Property not found.'}, status=404)

    favourite, created = Favourite.objects.get_or_create(user=request.user, property=property_obj)
    if created:
        saved = True
        message = 'Property saved.'
    else:
        favourite.delete()
        saved = False
        message = 'Removed from saved.'

    return JsonResponse({
        'message': message,
        'saved': saved,
        'property_id': str(property_obj.id),
    })


def admin_property_payload(property_obj, request=None):
    if property_obj.status == Property.Status.PUBLISHED:
        admin_status = 'active'
    elif (
        property_obj.status == Property.Status.DRAFT
        and property_obj.verification_status == Property.VerificationStatus.PENDING
    ):
        admin_status = 'pending'
    elif property_obj.status == Property.Status.FLAGGED:
        admin_status = 'flagged'
    elif property_obj.status == Property.Status.SOLD:
        admin_status = 'sold'
    elif property_obj.status == Property.Status.RENTED:
        admin_status = 'rented'
    else:
        admin_status = 'rejected'

    return {
        'id': str(property_obj.id),
        'title': property_obj.title,
        'owner': property_obj.owner_name or '-',
        'type': property_obj.get_listing_type_display(),
        'rawType': property_obj.listing_type,
        'price': property_obj.formatted_price,
        'submitted': property_obj.created_at.strftime('%d %b %Y'),
        'img': (
            property_display_image_url(request, property_obj)
            if request
            else property_obj.main_image_url
        ) or 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120&q=60',
        'status': admin_status,
        'verified': property_obj.verification_status == Property.VerificationStatus.VERIFIED,
        'verificationStatus': property_obj.verification_status,
        'reviewNote': property_obj.review_note,
        'area': str(property_obj.area),
        'documentUrl': (
            property_obj.verification_document_url
            or (
                media_url(request, property_obj.verification_document)
                if request and property_obj.verification_document
                else ''
            )
        ),
        'documentName': (
            property_obj.verification_document.name.rsplit('/', 1)[-1]
            if property_obj.verification_document
            else property_obj.verification_document_url.rsplit('/', 1)[-1]
            if property_obj.verification_document_url
            else ''
        ),
    }


def admin_user_payload(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    role = 'Admin' if user.is_staff else profile.get_role_display()
    if not user.is_active:
        status = 'banned'
    elif profile.verification_status == UserProfile.VerificationStatus.PENDING:
        status = 'pending'
    else:
        status = 'active'

    return {
        'id': str(user.id),
        'name': user.get_full_name() or user.username,
        'email': user.email or '-',
        'role': role,
        'rawRole': profile.role,
        'status': status,
        'verificationStatus': profile.verification_status,
        'verificationLabel': profile.get_verification_status_display(),
        'joined': user.date_joined.strftime('%d %b %Y'),
        'listings': getattr(user, 'listing_count', 0),
        'reports': 0,
    }


def admin_contact_message_payload(message):
    return {
        'id': str(message.id),
        'name': message.name,
        'email': message.email,
        'subject': message.subject,
        'message': message.message,
        'status': message.status,
        'created': message.created_at.strftime('%d %b %Y, %I:%M%p'),
    }


def admin_listing_report_payload(report, request=None):
    resolved_by = ''
    if report.resolved_by:
        resolved_by = report.resolved_by.get_full_name() or report.resolved_by.username
    owner_reports = owner_listing_reports(report)

    return {
        'id': str(report.id),
        'propertyId': str(report.property_id),
        'listing': report.property.title,
        'owner': report.property.owner_name or 'Unknown owner',
        'ownerReportTotal': owner_reports.count(),
        'ownerOpenReportTotal': owner_reports.filter(status=ListingReport.Status.OPEN).count(),
        'reporter': report.reporter_name or report.reporter_email or 'Anonymous',
        'reason': report.reason,
        'date': report.created_at.strftime('%d %b %Y, %I:%M%p'),
        'severity': report.severity,
        'status': report.status,
        'evidenceChecked': report.evidence_checked,
        'ownerContacted': report.owner_contacted,
        'investigationNotes': report.investigation_notes,
        'resolvedBy': resolved_by,
        'resolvedAt': report.resolved_at.strftime('%d %b %Y, %I:%M%p') if report.resolved_at else '',
        'documentUrl': (
            report.property.verification_document_url
            or (
                media_url(request, report.property.verification_document)
                if request and report.property.verification_document
                else ''
            )
        ),
    }


def owner_listing_reports(report):
    property_obj = report.property
    if property_obj.owner_id:
        return ListingReport.objects.filter(property__owner_id=property_obj.owner_id)

    owner_email = str(property_obj.owner_email or '').strip()
    if owner_email:
        return ListingReport.objects.filter(property__owner_email__iexact=owner_email)

    owner_phone = str(property_obj.owner_phone or '').strip()
    if owner_phone:
        return ListingReport.objects.filter(property__owner_phone=owner_phone)

    return ListingReport.objects.filter(property_id=property_obj.id)


def admin_dashboard_api(request):
    denied = staff_required_json(request)
    if denied:
        return denied

    User = get_user_model()
    properties = Property.objects.select_related('area').prefetch_related('images').all()
    users = User.objects.annotate(listing_count=Count('properties'))
    contact_messages = ContactMessage.objects.all()
    listing_reports = ListingReport.objects.select_related('property', 'property__owner').all()
    listings = [admin_property_payload(property_obj, request) for property_obj in properties]
    review_properties = properties.filter(
        status=Property.Status.DRAFT,
        verification_status=Property.VerificationStatus.PENDING,
    )
    pending_listings = [admin_property_payload(property_obj, request) for property_obj in review_properties]
    flagged_listings = [item for item in listings if item['status'] == 'flagged']

    listing_breakdown = {
        'rent': properties.filter(listing_type=Property.ListingType.RENT).count(),
        'buy': properties.filter(listing_type=Property.ListingType.BUY).count(),
        'land': properties.filter(listing_type=Property.ListingType.LAND).count(),
    }

    data = {
        'stats': {
            'totalListings': properties.count(),
            'activeListings': properties.filter(status=Property.Status.PUBLISHED).count(),
            'pendingListings': len(pending_listings),
            'flaggedListings': len(flagged_listings),
            'registeredUsers': users.count(),
            'openEnquiries': (
                Enquiry.objects.filter(status=Enquiry.Status.NEW).count()
                + contact_messages.filter(status=ContactMessage.Status.NEW).count()
                + listing_reports.filter(status=ListingReport.Status.OPEN).count()
            ),
            'verifiedListings': properties.filter(verification_status=Property.VerificationStatus.VERIFIED).count(),
            'listingBreakdown': listing_breakdown,
        },
        'listings': listings,
        'listingQueue': pending_listings,
        'flaggedQueue': flagged_listings,
        'verificationQueue': pending_listings,
        'users': [admin_user_payload(user) for user in users],
        'reports': [
            admin_listing_report_payload(report, request)
            for report in listing_reports.order_by('-created_at')[:50]
        ],
        'contactMessages': [
            admin_contact_message_payload(message)
            for message in contact_messages.order_by('-created_at')[:50]
        ],
        'settings': platform_settings_payload(PlatformSetting.load(), request.user),
        'recentActivity': [
            {
                'text': f'New enquiry from {enquiry.name} for {enquiry.property.title}',
                'time': enquiry.created_at.strftime('%d %b %Y, %I:%M%p'),
                'kind': 'enquiry',
            }
            for enquiry in Enquiry.objects.select_related('property').order_by('-created_at')[:8]
        ],
    }
    return JsonResponse(data)


@require_http_methods(['GET', 'POST'])
def admin_settings_api(request):
    denied = staff_required_json(request)
    if denied:
        return denied

    settings_obj = PlatformSetting.load()

    if request.method == 'GET':
        return JsonResponse({'settings': platform_settings_payload(settings_obj, request.user)})

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    boolean_fields = {
        'allowNewUserRegistrations': 'allow_new_user_registrations',
        'enableListingSubmissions': 'enable_listing_submissions',
        'requireEmailVerification': 'require_email_verification',
        'maintenanceMode': 'maintenance_mode',
        'autoApproveVerifiedOwners': 'auto_approve_verified_owners',
        'requireDocumentUpload': 'require_document_upload',
        'enableFairPriceIndicator': 'enable_fair_price_indicator',
        'showViewCountsPublicly': 'show_view_counts_publicly',
    }
    for payload_key, model_field in boolean_fields.items():
        if payload_key in payload:
            setattr(settings_obj, model_field, bool(payload[payload_key]))

    rental_coverage = payload.get('rentalCoverage')
    if rental_coverage in PlatformSetting.RentalCoverage.values:
        settings_obj.rental_coverage = rental_coverage

    buy_land_coverage = payload.get('buyLandCoverage')
    if buy_land_coverage in PlatformSetting.BuyLandCoverage.values:
        settings_obj.buy_land_coverage = buy_land_coverage

    settings_obj.save()

    admin_name = str(payload.get('adminName') or '').strip()
    admin_email = str(payload.get('adminEmail') or '').strip().lower()
    new_password = str(payload.get('newPassword') or '')

    if admin_name:
        parts = admin_name.split(' ', 1)
        request.user.first_name = parts[0]
        request.user.last_name = parts[1] if len(parts) > 1 else ''
    if admin_email:
        User = get_user_model()
        if User.objects.exclude(id=request.user.id).filter(email__iexact=admin_email).exists():
            return JsonResponse({'error': 'Another account already uses this email.'}, status=400)
        if User.objects.exclude(id=request.user.id).filter(username__iexact=admin_email).exists():
            return JsonResponse({'error': 'Another account already uses this email as username.'}, status=400)
        request.user.email = admin_email
        request.user.username = admin_email
    if new_password:
        if len(new_password) < 8:
            return JsonResponse({'error': 'New password must be at least 8 characters.'}, status=400)
        request.user.set_password(new_password)
        update_session_auth_hash(request, request.user)

    request.user.save()

    return JsonResponse({
        'message': 'Settings saved.',
        'settings': platform_settings_payload(settings_obj, request.user),
        'user': current_user_payload(request.user),
    })


@require_POST
def admin_listing_report_action_api(request, report_id, action):
    denied = staff_required_json(request)
    if denied:
        return denied

    try:
        report = ListingReport.objects.select_related('property').get(id=report_id)
    except ListingReport.DoesNotExist:
        return JsonResponse({'error': 'Report not found.'}, status=404)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        payload = {}

    if action in ['dismiss', 'take_down']:
        investigation_notes = str(payload.get('investigationNotes') or '').strip()
        if not investigation_notes:
            return JsonResponse({'error': 'Please add an investigation note before resolving this report.'}, status=400)

        report.evidence_checked = bool(payload.get('evidenceChecked'))
        report.owner_contacted = bool(payload.get('ownerContacted'))
        report.investigation_notes = investigation_notes
        report.resolved_by = request.user
        report.resolved_at = timezone.now()

    if action == 'dismiss':
        report.status = ListingReport.Status.DISMISSED
        report.save(update_fields=[
            'status',
            'evidence_checked',
            'owner_contacted',
            'investigation_notes',
            'resolved_by',
            'resolved_at',
            'updated_at',
        ])
        message = 'Report dismissed.'
    elif action == 'take_down':
        report.property.status = Property.Status.DRAFT
        report.property.verification_status = Property.VerificationStatus.UNVERIFIED
        report.property.save(update_fields=['status', 'verification_status', 'updated_at'])
        report.status = ListingReport.Status.ACTIONED
        report.save(update_fields=[
            'status',
            'evidence_checked',
            'owner_contacted',
            'investigation_notes',
            'resolved_by',
            'resolved_at',
            'updated_at',
        ])
        message = 'Listing taken down.'
    elif action == 'delete':
        report.delete()
        return JsonResponse({'message': 'Report deleted.'})
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    return JsonResponse({
        'message': message,
        'report': admin_listing_report_payload(report, request),
    })


@require_POST
def admin_contact_message_action_api(request, message_id, action):
    denied = staff_required_json(request)
    if denied:
        return denied

    try:
        message = ContactMessage.objects.get(id=message_id)
    except ContactMessage.DoesNotExist:
        return JsonResponse({'error': 'Message not found.'}, status=404)

    if action == 'read':
        message.status = ContactMessage.Status.READ
        message.save(update_fields=['status', 'updated_at'])
        response_message = 'Message marked as read.'
    elif action == 'close':
        message.status = ContactMessage.Status.CLOSED
        message.save(update_fields=['status', 'updated_at'])
        response_message = 'Message closed.'
    elif action == 'delete':
        message.delete()
        return JsonResponse({'message': 'Message deleted.'})
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    return JsonResponse({
        'message': response_message,
        'contactMessage': admin_contact_message_payload(message),
    })


@require_POST
def admin_property_action_api(request, property_id, action):
    denied = staff_required_json(request)
    if denied:
        return denied

    try:
        property_obj = Property.objects.get(id=property_id)
    except Property.DoesNotExist:
        return JsonResponse({'error': 'Property not found.'}, status=404)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        payload = {}

    if action == 'publish':
        property_obj.status = Property.Status.PUBLISHED
        property_obj.verification_status = Property.VerificationStatus.VERIFIED
        property_obj.published_at = timezone.now()
        property_obj.review_note = ''
        property_obj.save(update_fields=['status', 'verification_status', 'published_at', 'review_note', 'updated_at'])
        message = 'Listing approved and published.'
    elif action == 'clear_flag':
        if property_obj.verification_status == Property.VerificationStatus.VERIFIED:
            property_obj.status = Property.Status.PUBLISHED
            message = 'Flag cleared and listing restored.'
        else:
            property_obj.status = Property.Status.DRAFT
            property_obj.verification_status = Property.VerificationStatus.PENDING
            message = 'Flag cleared. Listing returned to verification queue.'
        if property_obj.status == Property.Status.PUBLISHED and not property_obj.published_at:
            property_obj.published_at = timezone.now()
        property_obj.save(update_fields=['status', 'verification_status', 'published_at', 'updated_at'])
        ListingReport.objects.filter(
            property=property_obj,
            status=ListingReport.Status.OPEN,
        ).update(status=ListingReport.Status.DISMISSED, updated_at=timezone.now())
    elif action == 'reject':
        review_note = str(payload.get('reviewNote') or payload.get('review_note') or '').strip()
        if not review_note:
            return JsonResponse({'error': 'Add a rejection note so the owner knows what to fix.'}, status=400)
        property_obj.status = Property.Status.DRAFT
        property_obj.verification_status = Property.VerificationStatus.UNVERIFIED
        property_obj.review_note = review_note
        property_obj.save(update_fields=['status', 'verification_status', 'review_note', 'updated_at'])
        message = 'Listing moved back to draft.'
    elif action == 'mark_sold':
        if property_obj.listing_type == Property.ListingType.RENT:
            return JsonResponse({'error': 'Use rented for rental listings.'}, status=400)
        property_obj.status = Property.Status.SOLD
        property_obj.save(update_fields=['status', 'updated_at'])
        message = 'Listing marked as sold and removed from public search.'
    elif action == 'mark_rented':
        if property_obj.listing_type != Property.ListingType.RENT:
            return JsonResponse({'error': 'Use sold for buy and land listings.'}, status=400)
        property_obj.status = Property.Status.RENTED
        property_obj.save(update_fields=['status', 'updated_at'])
        message = 'Listing marked as rented and removed from public search.'
    elif action == 'delete':
        property_obj.delete()
        return JsonResponse({'message': 'Listing deleted.'})
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    return JsonResponse({
        'message': message,
        'property': admin_property_payload(property_obj, request),
    })


@require_POST
def admin_user_action_api(request, user_id, action):
    denied = staff_required_json(request)
    if denied:
        return denied

    User = get_user_model()
    try:
        user = User.objects.annotate(listing_count=Count('properties')).get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found.'}, status=404)

    if user == request.user and action in ['suspend', 'remove']:
        return JsonResponse({'error': 'You cannot suspend or remove your own admin account.'}, status=400)

    if action == 'suspend':
        user.is_active = False
        user.save(update_fields=['is_active'])
        message = 'User suspended.'
    elif action == 'reinstate':
        user.is_active = True
        user.save(update_fields=['is_active'])
        message = 'User reinstated.'
    elif action == 'verify_profile':
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.verification_status = UserProfile.VerificationStatus.VERIFIED
        profile.save(update_fields=['verification_status', 'updated_at'])
        message = 'User profile verified.'
    elif action == 'mark_profile_pending':
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.verification_status = UserProfile.VerificationStatus.PENDING
        profile.save(update_fields=['verification_status', 'updated_at'])
        message = 'User profile marked for review.'
    elif action == 'unverify_profile':
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.verification_status = UserProfile.VerificationStatus.UNVERIFIED
        profile.save(update_fields=['verification_status', 'updated_at'])
        message = 'User profile marked unverified.'
    elif action == 'remove':
        user.delete()
        return JsonResponse({'message': 'User removed.'})
    else:
        return JsonResponse({'error': 'Invalid action.'}, status=400)

    return JsonResponse({
        'message': message,
        'user': admin_user_payload(user),
    })


def current_user_payload(user):
    if not user.is_authenticated:
        return None

    profile, _ = UserProfile.objects.get_or_create(user=user)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'name': user.get_full_name() or user.username,
        'is_staff': user.is_staff,
        'phone': profile.phone,
        'whatsapp': profile.whatsapp,
        'role': profile.role,
        'role_label': profile.get_role_display(),
        'verification_status': profile.verification_status,
        'verification_label': profile.get_verification_status_display(),
    }


def normalise_profile_role(value):
    role = str(value or '').strip().lower()
    role_map = {
        'tenant / buyer': UserProfile.Role.TENANT_BUYER,
        'tenant': UserProfile.Role.TENANT_BUYER,
        'buyer': UserProfile.Role.TENANT_BUYER,
        'landlord': UserProfile.Role.LANDLORD,
        'real estate agent': UserProfile.Role.AGENT,
        'agent': UserProfile.Role.AGENT,
        'property developer': UserProfile.Role.DEVELOPER,
        'developer': UserProfile.Role.DEVELOPER,
    }
    return role_map.get(role, UserProfile.Role.TENANT_BUYER)


def create_email_verification_token(user):
    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(hours=24)
    verification, _ = EmailVerificationToken.objects.update_or_create(
        user=user,
        defaults={
            'token': token,
            'expires_at': expires_at,
        },
    )
    return verification


def email_verification_payload(request, verification):
    path = reverse('verify_email_api', args=[verification.token])
    payload = {'email_verification_required': True}

    if settings.DEBUG or 'test' in sys.argv:
        payload['verification_url'] = request.build_absolute_uri(path)

    return payload


def auth_status_api(request):
    return JsonResponse({'user': current_user_payload(request.user)})


@require_POST
def login_api(request):
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    identifier = str(payload.get('email') or payload.get('username') or '').strip()
    password = str(payload.get('password') or '')

    if not identifier or not password:
        return JsonResponse({'error': 'Enter your email/username and password.'}, status=400)

    User = get_user_model()
    username = identifier
    if '@' in identifier:
        user = User.objects.filter(email__iexact=identifier).first()
        if user:
            username = user.username

    user = authenticate(request, username=username, password=password)
    if user is None:
        matching_user = User.objects.filter(username=username).first()
        if matching_user and not matching_user.is_active and PlatformSetting.load().require_email_verification:
            return JsonResponse({'error': 'Please verify your email before logging in.'}, status=403)
        return JsonResponse({'error': 'Invalid login details.'}, status=400)

    login(request, user)
    return JsonResponse({'message': 'Logged in successfully.', 'user': current_user_payload(user)})


def verify_email_api(request, token):
    verification = EmailVerificationToken.objects.select_related('user').filter(token=token).first()
    if not verification:
        return JsonResponse({'error': 'Invalid verification link.'}, status=404)

    if verification.is_expired:
        return JsonResponse({'error': 'This verification link has expired.'}, status=400)

    user = verification.user
    user.is_active = True
    user.save(update_fields=['is_active'])
    verification.delete()
    login(request, user)

    return JsonResponse({
        'message': 'Email verified successfully.',
        'user': current_user_payload(user),
    })


@require_POST
def register_api(request):
    settings_obj = PlatformSetting.load()
    if settings_obj.maintenance_mode:
        return JsonResponse({'error': 'Registration is temporarily unavailable during maintenance.'}, status=503)
    if not settings_obj.allow_new_user_registrations:
        return JsonResponse({'error': 'New user registrations are currently disabled.'}, status=403)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    first_name = str(payload.get('first_name') or '').strip()
    last_name = str(payload.get('last_name') or '').strip()
    email = str(payload.get('email') or '').strip().lower()
    phone = str(payload.get('phone') or '').strip()
    whatsapp = str(payload.get('whatsapp') or '').strip()
    role = normalise_profile_role(payload.get('role'))
    password = str(payload.get('password') or '')

    if not first_name or not last_name or not email or not phone or not password:
        return JsonResponse({'error': 'Please fill all required fields.'}, status=400)

    if len(password) < 8:
        return JsonResponse({'error': 'Password must be at least 8 characters.'}, status=400)

    User = get_user_model()
    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return JsonResponse({'error': 'An account with this email already exists.'}, status=400)

    require_email_verification = settings_obj.require_email_verification
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=not require_email_verification,
    )
    UserProfile.objects.create(
        user=user,
        phone=phone,
        whatsapp=whatsapp,
        role=role,
    )

    if require_email_verification:
        verification = create_email_verification_token(user)
        payload = {
            'message': 'Account created. Please verify your email before logging in.',
            'user': None,
        }
        payload.update(email_verification_payload(request, verification))
        return JsonResponse(payload, status=201)

    login(request, user)
    return JsonResponse({'message': 'Account created successfully.', 'user': current_user_payload(user)}, status=201)


@require_POST
def logout_api(request):
    logout(request)
    return JsonResponse({'message': 'Logged out successfully.'})
