from django.contrib import admin
from django.utils import timezone

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


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'average_rent', 'updated_at')
    list_filter = ('state', 'country')
    search_fields = ('name', 'city', 'state')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'whatsapp', 'role', 'verification_status', 'updated_at')
    list_filter = ('role', 'verification_status')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email', 'phone', 'whatsapp')


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'expires_at', 'created_at')
    search_fields = ('user__username', 'user__email', 'token')
    readonly_fields = ('token', 'created_at', 'updated_at')


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1
    fields = ('image', 'image_url', 'caption', 'sort_order')


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    actions = ['publish_properties', 'mark_as_draft', 'mark_as_sold', 'mark_as_rented']
    list_display = (
        'title',
        'listing_type',
        'property_type',
        'area',
        'price',
        'status',
        'verification_status',
        'is_featured',
        'updated_at',
    )
    list_filter = (
        'listing_type',
        'status',
        'verification_status',
        'is_featured',
        'area__state',
        'area',
    )
    search_fields = ('title', 'property_type', 'address', 'description', 'owner_name')
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'
    inlines = [PropertyImageInline]
    fieldsets = (
        ('Listing', {
            'fields': (
                'title',
                'slug',
                'listing_type',
                'property_type',
                'area',
                'address',
                'description',
                'features',
            )
        }),
        ('Price and details', {
            'fields': (
                'price',
                'price_suffix',
                'bedrooms',
                'bathrooms',
                'size',
                'fair_price_note',
            )
        }),
        ('Media', {
            'fields': ('main_image', 'main_image_url', 'verification_document', 'verification_document_url')
        }),
        ('Owner contact', {
            'fields': ('owner', 'owner_name', 'owner_phone', 'owner_whatsapp', 'owner_email')
        }),
        ('Publishing', {
            'fields': (
                'verification_status',
                'status',
                'is_featured',
                'view_count',
                'whatsapp_click_count',
                'published_at',
                'review_note',
            )
        }),
    )

    @admin.action(description='Publish selected properties')
    def publish_properties(self, request, queryset):
        updated = queryset.update(
            status=Property.Status.PUBLISHED,
            verification_status=Property.VerificationStatus.VERIFIED,
            published_at=timezone.now(),
        )
        self.message_user(request, f'{updated} properties published.')

    @admin.action(description='Move selected properties back to draft')
    def mark_as_draft(self, request, queryset):
        updated = queryset.update(status=Property.Status.DRAFT)
        self.message_user(request, f'{updated} properties moved to draft.')

    @admin.action(description='Mark selected buy/land properties as sold')
    def mark_as_sold(self, request, queryset):
        updated = queryset.exclude(listing_type=Property.ListingType.RENT).update(status=Property.Status.SOLD)
        self.message_user(request, f'{updated} properties marked as sold.')

    @admin.action(description='Mark selected rental properties as rented')
    def mark_as_rented(self, request, queryset):
        updated = queryset.filter(listing_type=Property.ListingType.RENT).update(status=Property.Status.RENTED)
        self.message_user(request, f'{updated} properties marked as rented.')


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ('property', 'caption', 'sort_order', 'updated_at')
    list_filter = ('property__listing_type',)
    search_fields = ('property__title', 'caption')


@admin.register(Favourite)
class FavouriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'property', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'property__title')


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'property', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'phone', 'email', 'property__title')


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'status', 'created_at')
    list_filter = ('status', 'subject', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')


@admin.register(ListingReport)
class ListingReportAdmin(admin.ModelAdmin):
    list_display = (
        'property',
        'reporter_name',
        'reason',
        'severity',
        'status',
        'evidence_checked',
        'owner_contacted',
        'resolved_by',
        'resolved_at',
        'created_at',
    )
    list_filter = ('status', 'severity', 'evidence_checked', 'owner_contacted', 'created_at')
    search_fields = (
        'property__title',
        'reporter_name',
        'reporter_email',
        'reason',
        'investigation_notes',
    )
    readonly_fields = ('resolved_by', 'resolved_at')


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = (
        '__str__',
        'allow_new_user_registrations',
        'enable_listing_submissions',
        'maintenance_mode',
        'rental_coverage',
        'updated_at',
    )
    fieldsets = (
        ('General settings', {
            'fields': (
                'allow_new_user_registrations',
                'enable_listing_submissions',
                'require_email_verification',
                'maintenance_mode',
            )
        }),
        ('Listing rules', {
            'fields': (
                'auto_approve_verified_owners',
                'require_document_upload',
                'enable_fair_price_indicator',
                'show_view_counts_publicly',
            )
        }),
        ('Geographic restrictions', {
            'fields': ('rental_coverage', 'buy_land_coverage')
        }),
    )

    def has_add_permission(self, request):
        return not PlatformSetting.objects.exists()
