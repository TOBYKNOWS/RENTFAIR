import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

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


class RentFairAPITestCase(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.owner = self.User.objects.create_user(
            username='owner@example.com',
            email='owner@example.com',
            password='strong-pass-123',
            first_name='Owner',
            last_name='User',
        )
        UserProfile.objects.create(
            user=self.owner,
            phone='08010000000',
            role=UserProfile.Role.LANDLORD,
        )
        self.admin = self.User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='strong-pass-123',
            is_staff=True,
            is_superuser=True,
        )
        UserProfile.objects.create(
            user=self.admin,
            phone='08020000000',
            role=UserProfile.Role.AGENT,
        )
        self.area = Area.objects.create(name='Ado-Ekiti', city='Ado-Ekiti', state='Ekiti')
        PlatformSetting.load()

    def post_json(self, url, payload=None):
        return self.client.post(
            url,
            data=json.dumps(payload or {}),
            content_type='application/json',
        )

    def create_property(
        self,
        *,
        listing_type=Property.ListingType.RENT,
        status=Property.Status.PUBLISHED,
        verification_status=Property.VerificationStatus.VERIFIED,
        owner=None,
        slug='test-property',
        title='Test Property',
        price=None,
        view_count=0,
        whatsapp_click_count=0,
    ):
        return Property.objects.create(
            title=title,
            slug=slug,
            listing_type=listing_type,
            property_type='2 Bedroom Flat' if listing_type != Property.ListingType.LAND else 'Residential Land',
            area=self.area,
            price=price if price is not None else (450000 if listing_type == Property.ListingType.RENT else 12000000),
            price_suffix='/year' if listing_type == Property.ListingType.RENT else '',
            description='Clean listing for tests.',
            owner=owner or self.owner,
            owner_name='Owner User',
            owner_phone='08010000000',
            owner_email='owner@example.com',
            verification_status=verification_status,
            status=status,
            view_count=view_count,
            whatsapp_click_count=whatsapp_click_count,
        )

    def property_submit_payload(self, **overrides):
        payload = {
            'title': 'New Verification Listing',
            'listing_type': 'rent',
            'state': 'Ekiti',
            'area': 'Ado-Ekiti',
            'city': 'Ado-Ekiti',
            'price': 350000,
            'property_type': 'Mini Flat',
            'description': 'A clean mini flat awaiting admin approval.',
            'owner_name': 'Owner User',
            'owner_phone': '08010000000',
            'owner_email': 'owner@example.com',
            'features': ['Water', 'Fenced compound'],
        }
        payload.update(overrides)
        return payload


class RegistrationProfileTests(RentFairAPITestCase):
    def test_registration_saves_user_profile(self):
        response = self.post_json(reverse('register_api'), {
            'first_name': 'Ada',
            'last_name': 'Bamidele',
            'email': 'ada@example.com',
            'phone': '08030000000',
            'whatsapp': '08030000001',
            'role': 'agent',
            'password': 'strong-pass-123',
        })

        self.assertEqual(response.status_code, 201)
        user = self.User.objects.get(email='ada@example.com')
        self.assertEqual(user.first_name, 'Ada')
        self.assertEqual(user.profile.phone, '08030000000')
        self.assertEqual(user.profile.whatsapp, '08030000001')
        self.assertEqual(user.profile.role, UserProfile.Role.AGENT)
        self.assertEqual(user.profile.verification_status, UserProfile.VerificationStatus.UNVERIFIED)

    def test_registration_requires_email_verification_when_enabled(self):
        settings_obj = PlatformSetting.load()
        settings_obj.require_email_verification = True
        settings_obj.save(update_fields=['require_email_verification'])

        response = self.post_json(reverse('register_api'), {
            'first_name': 'Tola',
            'last_name': 'Verified',
            'email': 'tola@example.com',
            'phone': '08030000000',
            'role': 'landlord',
            'password': 'strong-pass-123',
        })

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['email_verification_required'])
        user = self.User.objects.get(email='tola@example.com')
        self.assertFalse(user.is_active)
        verification = EmailVerificationToken.objects.get(user=user)

        login_response = self.post_json(reverse('login_api'), {
            'email': 'tola@example.com',
            'password': 'strong-pass-123',
        })
        self.assertEqual(login_response.status_code, 403)

        verify_response = self.client.get(reverse('verify_email_api', args=[verification.token]))
        self.assertEqual(verify_response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(EmailVerificationToken.objects.filter(user=user).exists())


class PropertySubmissionVerificationTests(RentFairAPITestCase):
    def test_property_submission_goes_to_verification_queue(self):
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload())

        self.assertEqual(response.status_code, 201)
        property_obj = Property.objects.get(title='New Verification Listing')
        self.assertEqual(property_obj.status, Property.Status.DRAFT)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.PENDING)

        self.client.force_login(self.admin)
        dashboard_response = self.client.get(reverse('admin_dashboard_api'))
        self.assertEqual(dashboard_response.status_code, 200)
        queue = dashboard_response.json()['verificationQueue']
        self.assertEqual(len(queue), 1)
        self.assertEqual(queue[0]['title'], 'New Verification Listing')

    def test_verified_owner_can_be_auto_approved_with_complete_listing(self):
        self.owner.profile.verification_status = UserProfile.VerificationStatus.VERIFIED
        self.owner.profile.save(update_fields=['verification_status'])
        settings_obj = PlatformSetting.load()
        settings_obj.auto_approve_verified_owners = True
        settings_obj.save(update_fields=['auto_approve_verified_owners'])
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload(
            description='A complete and well described mini flat with water, power, parking, and safe access.',
            main_image_url='https://example.com/property.jpg',
        ))

        self.assertEqual(response.status_code, 201)
        property_obj = Property.objects.get(title='New Verification Listing')
        self.assertEqual(property_obj.status, Property.Status.PUBLISHED)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.VERIFIED)
        self.assertIsNotNone(property_obj.published_at)

    def test_verified_owner_incomplete_listing_still_goes_to_review(self):
        self.owner.profile.verification_status = UserProfile.VerificationStatus.VERIFIED
        self.owner.profile.save(update_fields=['verification_status'])
        settings_obj = PlatformSetting.load()
        settings_obj.auto_approve_verified_owners = True
        settings_obj.save(update_fields=['auto_approve_verified_owners'])
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload(
            description='Too short for fast track.',
        ))

        self.assertEqual(response.status_code, 201)
        property_obj = Property.objects.get(title='New Verification Listing')
        self.assertEqual(property_obj.status, Property.Status.DRAFT)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.PENDING)
        self.assertIsNone(property_obj.published_at)

    def test_selected_buy_land_coverage_rejects_unselected_buy_state(self):
        settings_obj = PlatformSetting.load()
        settings_obj.buy_land_coverage = PlatformSetting.BuyLandCoverage.SELECTED
        settings_obj.rental_coverage = PlatformSetting.RentalCoverage.EKITI
        settings_obj.save(update_fields=['buy_land_coverage', 'rental_coverage'])
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload(
            title='Lagos House',
            listing_type='buy',
            state='Lagos',
            area='Lekki',
            property_type='Duplex',
            price=25000000,
        ))

        self.assertEqual(response.status_code, 400)
        self.assertIn('Buy and land listings', response.json()['error'])
        self.assertFalse(Property.objects.filter(title='Lagos House').exists())

    def test_nationwide_buy_land_coverage_allows_any_buy_state(self):
        settings_obj = PlatformSetting.load()
        settings_obj.buy_land_coverage = PlatformSetting.BuyLandCoverage.NATIONWIDE
        settings_obj.rental_coverage = PlatformSetting.RentalCoverage.EKITI
        settings_obj.save(update_fields=['buy_land_coverage', 'rental_coverage'])
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload(
            title='Lagos House',
            listing_type='buy',
            state='Lagos',
            area='Lekki',
            property_type='Duplex',
            price=25000000,
        ))

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Property.objects.filter(title='Lagos House').exists())

    def test_property_submission_saves_gallery_image_urls(self):
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload(
            gallery_image_urls=[
                'https://example.com/exterior.jpg',
                'https://example.com/living-room.jpg',
            ],
        ))

        self.assertEqual(response.status_code, 201)
        property_obj = Property.objects.get(title='New Verification Listing')
        self.assertEqual(
            list(property_obj.images.values_list('image_url', flat=True)),
            ['https://example.com/exterior.jpg', 'https://example.com/living-room.jpg'],
        )

    @override_settings(TESTING=False)
    @patch.dict('os.environ', {'CLOUDINARY_URL': 'cloudinary://key:secret@demo'})
    @patch('core.views.cloudinary.uploader.upload')
    def test_property_submission_uploads_media_to_cloudinary_when_configured(self, upload_mock):
        upload_mock.return_value = {'secure_url': 'https://res.cloudinary.com/demo/image/upload/main.jpg'}
        self.client.force_login(self.owner)
        image = SimpleUploadedFile(
            'main.jpg',
            b'fake-image-bytes',
            content_type='image/jpeg',
        )
        payload = self.property_submit_payload()
        payload['main_image'] = image

        response = self.client.post(reverse('property_submit_api'), data=payload)

        self.assertEqual(response.status_code, 201)
        property_obj = Property.objects.get(title='New Verification Listing')
        self.assertEqual(property_obj.main_image_url, 'https://res.cloudinary.com/demo/image/upload/main.jpg')
        self.assertFalse(property_obj.main_image)
        upload_mock.assert_called_once()

    def test_property_submission_saves_full_address(self):
        self.client.force_login(self.owner)

        response = self.post_json(reverse('property_submit_api'), self.property_submit_payload(
            address='No. 12 Oke-Ila Street, Basiri, Ado-Ekiti',
        ))

        self.assertEqual(response.status_code, 201)
        property_obj = Property.objects.get(title='New Verification Listing')
        self.assertEqual(property_obj.address, 'No. 12 Oke-Ila Street, Basiri, Ado-Ekiti')


class PropertyUrlTests(RentFairAPITestCase):
    def test_property_get_absolute_url_resolves(self):
        property_obj = self.create_property(slug='resolved-property-url')

        self.assertEqual(property_obj.get_absolute_url(), '/properties/resolved-property-url/')
        response = self.client.get(property_obj.get_absolute_url())
        self.assertEqual(response.status_code, 200)


class PropertyImageCaptionTests(RentFairAPITestCase):
    @override_settings(DEBUG=True)
    def test_property_api_uses_relative_uploaded_main_image_url(self):
        property_obj = self.create_property()
        property_obj.main_image = 'properties/main/uploaded-main.jpg'
        property_obj.save(update_fields=['main_image'])

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['img'], '/media/properties/main/uploaded-main.jpg')

    @override_settings(DEBUG=False)
    def test_property_api_hides_local_media_urls_in_production(self):
        property_obj = self.create_property()
        property_obj.main_image = 'properties/main/uploaded-main.jpg'
        property_obj.save(update_fields=['main_image'])

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['img'], '')

    @override_settings(DEBUG=True)
    def test_property_api_uses_gallery_image_as_display_fallback(self):
        property_obj = self.create_property()
        PropertyImage.objects.create(
            property=property_obj,
            image='properties/gallery/fallback-gallery.jpg',
        )

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['img'], '/media/properties/gallery/fallback-gallery.jpg')

    def test_property_api_includes_gallery_image_captions(self):
        property_obj = self.create_property()
        PropertyImage.objects.create(
            property=property_obj,
            image_url='https://example.com/living-room.jpg',
            caption='Bright living room angle',
            sort_order=1,
        )

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['images'], ['https://example.com/living-room.jpg'])
        self.assertEqual(listing['imageItems'], [{
            'url': 'https://example.com/living-room.jpg',
            'caption': 'Bright living room angle',
        }])


class PropertyTrustSignalTests(RentFairAPITestCase):
    def test_property_api_exposes_owner_and_document_trust_signals(self):
        self.owner.profile.verification_status = UserProfile.VerificationStatus.VERIFIED
        self.owner.profile.role = UserProfile.Role.LANDLORD
        self.owner.profile.save(update_fields=['verification_status', 'role'])
        property_obj = self.create_property()
        property_obj.verification_document = 'properties/documents/test-document.pdf'
        property_obj.save(update_fields=['verification_document'])

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['owner']['role'], 'Landlord')
        self.assertTrue(listing['owner']['verified'])
        self.assertEqual(listing['owner']['badge'], 'Verified owner')
        self.assertEqual(listing['trust']['ownerBadge'], 'Verified owner')
        self.assertTrue(listing['trust']['listingReviewed'])
        self.assertTrue(listing['trust']['documentChecked'])
        self.assertEqual(
            listing['trust']['badges'],
            ['Verified owner', 'Listing reviewed', 'Document checked'],
        )


class UserProfileVerificationWorkflowTests(RentFairAPITestCase):
    def test_admin_can_verify_and_unverify_user_profile(self):
        self.client.force_login(self.admin)

        verify_response = self.client.post(reverse('admin_user_action_api', args=[self.owner.id, 'verify_profile']))
        self.assertEqual(verify_response.status_code, 200)
        self.owner.profile.refresh_from_db()
        self.assertEqual(self.owner.profile.verification_status, UserProfile.VerificationStatus.VERIFIED)
        self.assertEqual(verify_response.json()['user']['verificationStatus'], UserProfile.VerificationStatus.VERIFIED)

        pending_response = self.client.post(reverse('admin_user_action_api', args=[self.owner.id, 'mark_profile_pending']))
        self.assertEqual(pending_response.status_code, 200)
        self.owner.profile.refresh_from_db()
        self.assertEqual(self.owner.profile.verification_status, UserProfile.VerificationStatus.PENDING)

        unverify_response = self.client.post(reverse('admin_user_action_api', args=[self.owner.id, 'unverify_profile']))
        self.assertEqual(unverify_response.status_code, 200)
        self.owner.profile.refresh_from_db()
        self.assertEqual(self.owner.profile.verification_status, UserProfile.VerificationStatus.UNVERIFIED)

    def test_non_staff_cannot_verify_user_profile(self):
        self.client.force_login(self.owner)

        response = self.client.post(reverse('admin_user_action_api', args=[self.admin.id, 'verify_profile']))

        self.assertEqual(response.status_code, 403)
        self.admin.profile.refresh_from_db()
        self.assertEqual(self.admin.profile.verification_status, UserProfile.VerificationStatus.UNVERIFIED)


class FairPriceIndicatorTests(RentFairAPITestCase):
    def test_rental_fair_price_uses_area_average_rent(self):
        self.area.average_rent = 500000
        self.area.save(update_fields=['average_rent'])
        self.create_property(price=400000)

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['fairLabel'], 'Below area average')
        self.assertEqual(listing['fairInsight'], '20% below Ado-Ekiti avg')

    def test_rental_fair_price_can_be_disabled(self):
        self.area.average_rent = 500000
        self.area.save(update_fields=['average_rent'])
        settings_obj = PlatformSetting.load()
        settings_obj.enable_fair_price_indicator = False
        settings_obj.save(update_fields=['enable_fair_price_indicator'])
        self.create_property(price=400000)

        response = self.client.get(reverse('property_list_api'))

        self.assertEqual(response.status_code, 200)
        listing = response.json()['properties'][0]
        self.assertEqual(listing['fairLabel'], '')
        self.assertEqual(listing['fairInsight'], '')


class PropertyViewCountTests(RentFairAPITestCase):
    def test_public_listing_view_increments_once_per_session(self):
        property_obj = self.create_property()
        url = reverse('property_view_api', args=[property_obj.id])

        first_response = self.client.post(url)
        second_response = self.client.post(url)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.view_count, 1)
        self.assertTrue(first_response.json()['counted'])
        self.assertFalse(second_response.json()['counted'])
        self.assertEqual(first_response.json()['views'], 1)

    def test_view_counts_hide_when_platform_setting_disabled(self):
        settings_obj = PlatformSetting.load()
        settings_obj.show_view_counts_publicly = False
        settings_obj.save(update_fields=['show_view_counts_publicly'])
        property_obj = self.create_property()

        view_response = self.client.post(reverse('property_view_api', args=[property_obj.id]))
        list_response = self.client.get(reverse('property_list_api'))

        self.assertEqual(view_response.status_code, 200)
        self.assertIsNone(view_response.json()['views'])
        self.assertIsNone(list_response.json()['properties'][0]['views'])
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.view_count, 1)

    def test_owner_dashboard_shows_total_and_listing_view_counts(self):
        first_property = self.create_property(view_count=7)
        second_property = self.create_property(
            slug='second-viewed-property',
            title='Second Viewed Property',
            view_count=3,
        )
        self.client.force_login(self.owner)

        response = self.client.get(reverse('user_dashboard_api'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['stats']['views'], 10)
        listing_views = {
            listing['id']: listing['views']
            for listing in payload['listings']
        }
        self.assertEqual(listing_views[first_property.id], 7)
        self.assertEqual(listing_views[second_property.id], 3)

    def test_whatsapp_click_tracking_increments_property_leads(self):
        property_obj = self.create_property()
        url = reverse('property_whatsapp_click_api', args=[property_obj.id])

        first_response = self.client.post(url)
        second_response = self.client.post(url)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.whatsapp_click_count, 2)
        self.assertEqual(second_response.json()['whatsappClicks'], 2)

    def test_owner_dashboard_shows_total_and_listing_whatsapp_leads(self):
        first_property = self.create_property(whatsapp_click_count=4)
        second_property = self.create_property(
            slug='second-lead-property',
            title='Second Lead Property',
            whatsapp_click_count=2,
        )
        self.client.force_login(self.owner)

        response = self.client.get(reverse('user_dashboard_api'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['stats']['whatsappLeads'], 6)
        listing_leads = {
            listing['id']: listing['whatsappLeads']
            for listing in payload['listings']
        }
        self.assertEqual(listing_leads[first_property.id], 4)
        self.assertEqual(listing_leads[second_property.id], 2)


class AdminPropertyWorkflowTests(RentFairAPITestCase):
    def test_admin_can_publish_and_reject_listing(self):
        property_obj = self.create_property(
            status=Property.Status.DRAFT,
            verification_status=Property.VerificationStatus.PENDING,
        )
        self.client.force_login(self.admin)

        publish_url = reverse('admin_property_action_api', args=[property_obj.id, 'publish'])
        publish_response = self.client.post(publish_url)
        self.assertEqual(publish_response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.PUBLISHED)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.VERIFIED)
        self.assertIsNotNone(property_obj.published_at)

        reject_url = reverse('admin_property_action_api', args=[property_obj.id, 'reject'])
        reject_response = self.post_json(reject_url, {
            'reviewNote': 'Upload clearer exterior photo and missing verification document.',
        })
        self.assertEqual(reject_response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.DRAFT)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.UNVERIFIED)
        self.assertEqual(
            property_obj.review_note,
            'Upload clearer exterior photo and missing verification document.',
        )

    def test_admin_reject_requires_review_note_and_owner_can_see_it(self):
        property_obj = self.create_property(
            status=Property.Status.DRAFT,
            verification_status=Property.VerificationStatus.PENDING,
        )
        self.client.force_login(self.admin)

        missing_note_response = self.post_json(
            reverse('admin_property_action_api', args=[property_obj.id, 'reject']),
            {},
        )
        self.assertEqual(missing_note_response.status_code, 400)

        response = self.post_json(
            reverse('admin_property_action_api', args=[property_obj.id, 'reject']),
            {'reviewNote': 'Document missing. Please upload proof of ownership.'},
        )
        self.assertEqual(response.status_code, 200)

        self.client.force_login(self.owner)
        dashboard_response = self.client.get(reverse('user_dashboard_api'))
        self.assertEqual(dashboard_response.status_code, 200)
        listing = dashboard_response.json()['listings'][0]
        self.assertEqual(listing['reviewNote'], 'Document missing. Please upload proof of ownership.')

    def test_high_report_flags_listing_and_admin_can_restore_verified_listing(self):
        property_obj = self.create_property()

        report_response = self.post_json(reverse('listing_report_submit_api'), {
            'property_id': property_obj.id,
            'reason': 'fake scam payment request',
            'name': 'Reporter',
            'email': 'reporter@example.com',
        })
        self.assertEqual(report_response.status_code, 201)
        property_obj.refresh_from_db()
        report = ListingReport.objects.get(property=property_obj)
        self.assertEqual(report.severity, ListingReport.Severity.HIGH)
        self.assertEqual(property_obj.status, Property.Status.FLAGGED)

        self.client.force_login(self.admin)
        clear_url = reverse('admin_property_action_api', args=[property_obj.id, 'clear_flag'])
        clear_response = self.client.post(clear_url)
        self.assertEqual(clear_response.status_code, 200)
        property_obj.refresh_from_db()
        report.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.PUBLISHED)
        self.assertEqual(report.status, ListingReport.Status.DISMISSED)

    def test_admin_clear_flag_returns_unverified_listing_to_verification_queue(self):
        property_obj = self.create_property(
            status=Property.Status.FLAGGED,
            verification_status=Property.VerificationStatus.UNVERIFIED,
        )
        ListingReport.objects.create(
            property=property_obj,
            reason='fake listing',
            severity=ListingReport.Severity.HIGH,
        )
        self.client.force_login(self.admin)

        response = self.client.post(reverse('admin_property_action_api', args=[property_obj.id, 'clear_flag']))

        self.assertEqual(response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.DRAFT)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.PENDING)

    def test_admin_can_restore_sold_listing_as_active(self):
        property_obj = self.create_property(
            listing_type=Property.ListingType.BUY,
            status=Property.Status.SOLD,
            slug='sold-house',
            title='Sold House',
        )
        self.client.force_login(self.admin)

        response = self.client.post(reverse('admin_property_action_api', args=[property_obj.id, 'publish']))

        self.assertEqual(response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.PUBLISHED)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.VERIFIED)


class OwnerAvailabilityTests(RentFairAPITestCase):
    def test_owner_can_mark_rental_as_rented(self):
        property_obj = self.create_property()
        self.client.force_login(self.owner)

        response = self.client.post(reverse('owner_property_action_api', args=[property_obj.id, 'mark_rented']))

        self.assertEqual(response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.RENTED)

    def test_owner_can_mark_buy_listing_as_sold(self):
        property_obj = self.create_property(
            listing_type=Property.ListingType.BUY,
            slug='buy-house',
            title='Buy House',
        )
        self.client.force_login(self.owner)

        response = self.client.post(reverse('owner_property_action_api', args=[property_obj.id, 'mark_sold']))

        self.assertEqual(response.status_code, 200)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.SOLD)

    def test_owner_cannot_mark_flagged_listing_unavailable(self):
        property_obj = self.create_property(status=Property.Status.FLAGGED)
        self.client.force_login(self.owner)

        response = self.client.post(reverse('owner_property_action_api', args=[property_obj.id, 'mark_rented']))

        self.assertEqual(response.status_code, 400)
        property_obj.refresh_from_db()
        self.assertEqual(property_obj.status, Property.Status.FLAGGED)


class OwnerEnquiryManagementTests(RentFairAPITestCase):
    def test_owner_can_mark_enquiry_contacted_and_close_it(self):
        property_obj = self.create_property()
        enquiry = Enquiry.objects.create(
            property=property_obj,
            name='Prospect',
            phone='08030000000',
            message='Is this still available?',
        )
        self.client.force_login(self.owner)

        contacted_response = self.client.post(reverse('owner_enquiry_action_api', args=[enquiry.id, 'mark_contacted']))
        self.assertEqual(contacted_response.status_code, 200)
        enquiry.refresh_from_db()
        self.assertEqual(enquiry.status, Enquiry.Status.CONTACTED)

        close_response = self.client.post(reverse('owner_enquiry_action_api', args=[enquiry.id, 'close']))
        self.assertEqual(close_response.status_code, 200)
        enquiry.refresh_from_db()
        self.assertEqual(enquiry.status, Enquiry.Status.CLOSED)

        dashboard_response = self.client.get(reverse('user_dashboard_api'))
        self.assertEqual(dashboard_response.status_code, 200)
        self.assertEqual(dashboard_response.json()['stats']['enquiries'], 0)
        self.assertEqual(dashboard_response.json()['enquiries'], [])

    def test_owner_cannot_manage_another_owners_enquiry(self):
        other_owner = self.User.objects.create_user(
            username='other@example.com',
            email='other@example.com',
            password='strong-pass-123',
        )
        property_obj = self.create_property(owner=other_owner)
        enquiry = Enquiry.objects.create(
            property=property_obj,
            name='Prospect',
            phone='08030000000',
        )
        self.client.force_login(self.owner)

        response = self.client.post(reverse('owner_enquiry_action_api', args=[enquiry.id, 'close']))

        self.assertEqual(response.status_code, 404)
        enquiry.refresh_from_db()
        self.assertEqual(enquiry.status, Enquiry.Status.NEW)


class FavouriteTests(RentFairAPITestCase):
    def test_user_can_save_and_unsave_published_property(self):
        property_obj = self.create_property()
        self.client.force_login(self.owner)
        url = reverse('favourite_toggle_api', args=[property_obj.id])

        save_response = self.client.post(url)
        self.assertEqual(save_response.status_code, 200)
        self.assertTrue(save_response.json()['saved'])
        self.assertTrue(Favourite.objects.filter(user=self.owner, property=property_obj).exists())

        favourites_response = self.client.get(reverse('favourites_api'))
        self.assertEqual(favourites_response.status_code, 200)
        self.assertEqual(favourites_response.json()['ids'], [str(property_obj.id)])

        unsave_response = self.client.post(url)
        self.assertEqual(unsave_response.status_code, 200)
        self.assertFalse(unsave_response.json()['saved'])
        self.assertFalse(Favourite.objects.filter(user=self.owner, property=property_obj).exists())

    def test_user_cannot_save_draft_property(self):
        property_obj = self.create_property(status=Property.Status.DRAFT)
        self.client.force_login(self.owner)

        response = self.client.post(reverse('favourite_toggle_api', args=[property_obj.id]))

        self.assertEqual(response.status_code, 404)
        self.assertFalse(Favourite.objects.filter(user=self.owner, property=property_obj).exists())


class ContactMessageAndReportTests(RentFairAPITestCase):
    def test_contact_message_submits_and_admin_can_mark_read_and_close(self):
        response = self.post_json(reverse('contact_submit_api'), {
            'name': 'Visitor',
            'email': 'visitor@example.com',
            'subject': 'General enquiry',
            'message': 'Please call me back.',
        })
        self.assertEqual(response.status_code, 201)
        message = ContactMessage.objects.get(email='visitor@example.com')
        self.assertEqual(message.status, ContactMessage.Status.NEW)

        self.client.force_login(self.admin)
        read_response = self.client.post(reverse('admin_contact_message_action_api', args=[message.id, 'read']))
        self.assertEqual(read_response.status_code, 200)
        message.refresh_from_db()
        self.assertEqual(message.status, ContactMessage.Status.READ)

        close_response = self.client.post(reverse('admin_contact_message_action_api', args=[message.id, 'close']))
        self.assertEqual(close_response.status_code, 200)
        message.refresh_from_db()
        self.assertEqual(message.status, ContactMessage.Status.CLOSED)

    def test_admin_report_take_down_requires_and_saves_investigation_notes(self):
        property_obj = self.create_property(status=Property.Status.FLAGGED)
        report = ListingReport.objects.create(
            property=property_obj,
            reporter_name='Reporter',
            reporter_email='reporter@example.com',
            reason='fake scam listing',
            severity=ListingReport.Severity.HIGH,
        )
        self.client.force_login(self.admin)
        url = reverse('admin_listing_report_action_api', args=[report.id, 'take_down'])

        missing_note_response = self.post_json(url, {
            'evidenceChecked': True,
            'ownerContacted': True,
        })
        self.assertEqual(missing_note_response.status_code, 400)

        response = self.post_json(url, {
            'evidenceChecked': True,
            'ownerContacted': True,
            'investigationNotes': 'Checked document and contacted owner.',
        })
        self.assertEqual(response.status_code, 200)

        report.refresh_from_db()
        property_obj.refresh_from_db()
        self.assertEqual(report.status, ListingReport.Status.ACTIONED)
        self.assertTrue(report.evidence_checked)
        self.assertTrue(report.owner_contacted)
        self.assertEqual(report.resolved_by, self.admin)
        self.assertIsNotNone(report.resolved_at)
        self.assertEqual(property_obj.status, Property.Status.DRAFT)
        self.assertEqual(property_obj.verification_status, Property.VerificationStatus.UNVERIFIED)

    def test_admin_report_payload_shows_owner_report_history(self):
        first_property = self.create_property()
        second_property = self.create_property(
            slug='same-owner-report-property',
            title='Same Owner Report Property',
        )
        ListingReport.objects.create(
            property=first_property,
            reason='payment before viewing',
            severity=ListingReport.Severity.HIGH,
        )
        ListingReport.objects.create(
            property=second_property,
            reason='fake photos',
            severity=ListingReport.Severity.HIGH,
        )
        self.client.force_login(self.admin)

        response = self.client.get(reverse('admin_dashboard_api'))

        self.assertEqual(response.status_code, 200)
        reports = response.json()['reports']
        self.assertTrue(reports)
        for report in reports:
            self.assertEqual(report['ownerReportTotal'], 2)
            self.assertEqual(report['ownerOpenReportTotal'], 2)
            self.assertEqual(report['owner'], 'Owner User')
