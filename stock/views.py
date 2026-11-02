from rest_framework import generics
from .models import Item
from .serializers import ItemSerializer

class ItemListCreateAPIView(generics.ListCreateAPIView):
    queryset = Item.objects.all().order_by('-id')
    serializer_class = ItemSerializer

class ItemRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer