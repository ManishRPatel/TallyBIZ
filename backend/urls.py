from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/stock/', include('stock.urls')),
    path('api/selling/', include('selling.urls')),
    path('api/buying/', include('buying.urls')),
]