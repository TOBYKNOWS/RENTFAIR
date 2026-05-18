from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from core.views import (
    admin_dashboard_api,
    admin_contact_message_action_api,
    admin_listing_report_action_api,
    admin_property_action_api,
    admin_settings_api,
    admin_user_action_api,
    auth_status_api,
    contact_submit_api,
    enquiry_submit_api,
    favourite_toggle_api,
    favourites_api,
    home,
    listing_report_submit_api,
    login_api,
    logout_api,
    owner_enquiry_action_api,
    owner_property_action_api,
    property_detail,
    property_list_api,
    property_submit_api,
    property_view_api,
    property_whatsapp_click_api,
    register_api,
    user_dashboard_api,
    verify_email_api,
)

urlpatterns = [
    path('', home, name='home'),
    path('properties/<slug:slug>/', property_detail, name='property_detail'),
    path('api/properties/', property_list_api, name='property_list_api'),
    path('api/properties/submit/', property_submit_api, name='property_submit_api'),
    path('api/properties/<int:property_id>/view/', property_view_api, name='property_view_api'),
    path('api/properties/<int:property_id>/whatsapp-click/', property_whatsapp_click_api, name='property_whatsapp_click_api'),
    path('api/properties/<int:property_id>/<str:action>/', owner_property_action_api, name='owner_property_action_api'),
    path('api/enquiries/<int:enquiry_id>/<str:action>/', owner_enquiry_action_api, name='owner_enquiry_action_api'),
    path('api/dashboard/', user_dashboard_api, name='user_dashboard_api'),
    path('api/enquiries/submit/', enquiry_submit_api, name='enquiry_submit_api'),
    path('api/contact/submit/', contact_submit_api, name='contact_submit_api'),
    path('api/reports/submit/', listing_report_submit_api, name='listing_report_submit_api'),
    path('api/favourites/', favourites_api, name='favourites_api'),
    path('api/favourites/<int:property_id>/toggle/', favourite_toggle_api, name='favourite_toggle_api'),
    path('api/admin/dashboard/', admin_dashboard_api, name='admin_dashboard_api'),
    path('api/admin/contact-messages/<int:message_id>/<str:action>/', admin_contact_message_action_api, name='admin_contact_message_action_api'),
    path('api/admin/reports/<int:report_id>/<str:action>/', admin_listing_report_action_api, name='admin_listing_report_action_api'),
    path('api/admin/properties/<int:property_id>/<str:action>/', admin_property_action_api, name='admin_property_action_api'),
    path('api/admin/users/<int:user_id>/<str:action>/', admin_user_action_api, name='admin_user_action_api'),
    path('api/admin/settings/', admin_settings_api, name='admin_settings_api'),
    path('api/auth/status/', auth_status_api, name='auth_status_api'),
    path('api/auth/login/', login_api, name='login_api'),
    path('api/auth/register/', register_api, name='register_api'),
    path('api/auth/verify-email/<str:token>/', verify_email_api, name='verify_email_api'),
    path('api/auth/logout/', logout_api, name='logout_api'),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
