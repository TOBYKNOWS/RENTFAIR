from django.db import models
from django.urls import reverse
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Area(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, default='Ekiti')
    country = models.CharField(max_length=120, default='Nigeria')
    average_rent = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text='Optional yearly rent average for this area, in naira.',
    )

    class Meta:
        ordering = ['state', 'city', 'name']

    def __str__(self):
        location = ', '.join(part for part in [self.city, self.state] if part)
        return f'{self.name} ({location})' if location else self.name


class UserProfile(TimeStampedModel):
    class Role(models.TextChoices):
        TENANT_BUYER = 'tenant_buyer', 'Tenant / Buyer'
        LANDLORD = 'landlord', 'Landlord'
        AGENT = 'agent', 'Real Estate Agent'
        DEVELOPER = 'developer', 'Property Developer'

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = 'unverified', 'Unverified'
        PENDING = 'pending', 'Pending review'
        VERIFIED = 'verified', 'Verified'

    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=40, blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.TENANT_BUYER)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )

    class Meta:
        ordering = ['user__first_name', 'user__last_name', 'user__username']

    def __str__(self):
        return f'{self.user.get_full_name() or self.user.username} profile'


class EmailVerificationToken(TimeStampedModel):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='email_verification_token')
    token = models.CharField(max_length=96, unique=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Email verification for {self.user}'

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class Property(TimeStampedModel):
    class ListingType(models.TextChoices):
        RENT = 'rent', 'Rent'
        BUY = 'buy', 'Buy'
        LAND = 'land', 'Land'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        FLAGGED = 'flagged', 'Flagged'
        SOLD = 'sold', 'Sold'
        RENTED = 'rented', 'Rented'

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = 'unverified', 'Unverified'
        PENDING = 'pending', 'Pending review'
        VERIFIED = 'verified', 'Verified'

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, unique=True)
    listing_type = models.CharField(max_length=20, choices=ListingType.choices)
    property_type = models.CharField(
        max_length=80,
        help_text='Examples: Self-contained, 2-bedroom flat, duplex, residential land.',
    )
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name='properties')
    address = models.CharField(max_length=255, blank=True)
    price = models.PositiveIntegerField(help_text='Amount in naira.')
    price_suffix = models.CharField(
        max_length=40,
        blank=True,
        help_text='Examples: /year, /month. Leave blank for sale or land.',
    )
    bedrooms = models.PositiveSmallIntegerField(blank=True, null=True)
    bathrooms = models.PositiveSmallIntegerField(blank=True, null=True)
    size = models.CharField(max_length=80, blank=True, help_text='Examples: 600 sqm, 1 plot.')
    description = models.TextField()
    features = models.TextField(
        blank=True,
        help_text='Enter one feature per line, such as prepaid meter or fenced compound.',
    )
    review_note = models.TextField(blank=True, help_text='Admin feedback shown to the owner.')
    fair_price_note = models.CharField(max_length=160, blank=True)
    main_image = models.FileField(upload_to='properties/main/', blank=True)
    main_image_url = models.URLField(blank=True)
    verification_document = models.FileField(upload_to='properties/documents/', blank=True)
    verification_document_url = models.URLField(blank=True)
    owner = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='properties',
    )
    owner_name = models.CharField(max_length=120, blank=True)
    owner_phone = models.CharField(max_length=40, blank=True)
    owner_whatsapp = models.CharField(max_length=40, blank=True)
    owner_email = models.EmailField(blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    is_featured = models.BooleanField(default=False)
    view_count = models.PositiveIntegerField(default=0)
    whatsapp_click_count = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-is_featured', '-published_at', '-created_at']
        verbose_name_plural = 'properties'

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('property_detail', kwargs={'slug': self.slug})

    @property
    def formatted_price(self):
        amount = f'₦{self.price:,}'
        return f'{amount}{self.price_suffix}' if self.price_suffix else amount


class PropertyImage(TimeStampedModel):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.FileField(upload_to='properties/gallery/', blank=True)
    image_url = models.URLField(blank=True)
    caption = models.CharField(max_length=160, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        return self.caption or f'Image for {self.property}'


class Favourite(TimeStampedModel):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='favourites')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='favourited_by')

    class Meta:
        unique_together = ['user', 'property']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} saved {self.property}'


class Enquiry(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        CLOSED = 'closed', 'Closed'

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='enquiries')
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=40)
    email = models.EmailField(blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'enquiries'

    def __str__(self):
        return f'{self.name} - {self.property}'


class ContactMessage(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = 'new', 'New'
        READ = 'read', 'Read'
        CLOSED = 'closed', 'Closed'

    name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=80)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.subject} - {self.name}'


class ListingReport(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        DISMISSED = 'dismissed', 'Dismissed'
        ACTIONED = 'actioned', 'Actioned'

    class Severity(models.TextChoices):
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='reports')
    reporter_name = models.CharField(max_length=120, blank=True)
    reporter_email = models.EmailField(blank=True)
    reason = models.CharField(max_length=220)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    evidence_checked = models.BooleanField(default=False)
    owner_contacted = models.BooleanField(default=False)
    investigation_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='resolved_listing_reports',
    )
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report for {self.property}'


class PlatformSetting(TimeStampedModel):
    class RentalCoverage(models.TextChoices):
        EKITI = 'ekiti', 'Ekiti State only'
        EKITI_ONDO = 'ekiti_ondo', 'Ekiti + Ondo'
        SOUTH_WEST = 'south_west', 'All South-West states'
        NATIONWIDE = 'nationwide', 'Nationwide'

    class BuyLandCoverage(models.TextChoices):
        NATIONWIDE = 'nationwide', 'Nationwide (all 36 states + FCT)'
        SELECTED = 'selected', 'Selected states only'

    allow_new_user_registrations = models.BooleanField(default=True)
    enable_listing_submissions = models.BooleanField(default=True)
    require_email_verification = models.BooleanField(default=False)
    maintenance_mode = models.BooleanField(default=False)
    auto_approve_verified_owners = models.BooleanField(default=False)
    require_document_upload = models.BooleanField(default=False)
    enable_fair_price_indicator = models.BooleanField(default=True)
    show_view_counts_publicly = models.BooleanField(default=True)
    rental_coverage = models.CharField(
        max_length=20,
        choices=RentalCoverage.choices,
        default=RentalCoverage.EKITI,
    )
    buy_land_coverage = models.CharField(
        max_length=20,
        choices=BuyLandCoverage.choices,
        default=BuyLandCoverage.NATIONWIDE,
    )

    class Meta:
        verbose_name = 'platform setting'
        verbose_name_plural = 'platform settings'

    def __str__(self):
        return 'RentFair platform settings'

    @classmethod
    def load(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
