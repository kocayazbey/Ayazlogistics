'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon,
  TrashIcon,
  FolderIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  productCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  children?: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockCategories: Category[] = [
        {
          id: '1',
          name: 'Elektronik',
          description: 'Elektronik ürünler ve aksesuarları',
          productCount: 156,
          status: 'active',
          createdAt: '2024-01-15',
          children: [
            {
              id: '2',
              name: 'Telefon & Aksesuar',
              description: 'Cep telefonları ve aksesuarları',
              parentId: '1',
              productCount: 45,
              status: 'active',
              createdAt: '2024-01-16'
            },
            {
              id: '3',
              name: 'Bilgisayar & Tablet',
              description: 'Laptop, masaüstü ve tablet bilgisayarlar',
              parentId: '1',
              productCount: 67,
              status: 'active',
              createdAt: '2024-01-17'
            }
          ]
        },
        {
          id: '4',
          name: 'Giyim & Moda',
          description: 'Kadın, erkek ve çocuk giyim ürünleri',
          productCount: 234,
          status: 'active',
          createdAt: '2024-01-18',
          children: [
            {
              id: '5',
              name: 'Kadın Giyim',
              description: 'Kadın giyim ürünleri',
              parentId: '4',
              productCount: 98,
              status: 'active',
              createdAt: '2024-01-19'
            },
            {
              id: '6',
              name: 'Erkek Giyim',
              description: 'Erkek giyim ürünleri',
              parentId: '4',
              productCount: 76,
              status: 'active',
              createdAt: '2024-01-20'
            }
          ]
        },
        {
          id: '7',
          name: 'Ev & Yaşam',
          description: 'Ev dekorasyonu ve yaşam ürünleri',
          productCount: 89,
          status: 'active',
          createdAt: '2024-01-21'
        }
      ];
      
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      // Mock API call - replace with actual API
      const newCategory: Category = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        parentId: formData.parentId || undefined,
        productCount: 0,
        status: formData.status,
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (formData.parentId) {
        // Add as subcategory
        setCategories(prev => prev.map(cat => 
          cat.id === formData.parentId 
            ? { ...cat, children: [...(cat.children || []), newCategory] }
            : cat
        ));
      } else {
        // Add as main category
        setCategories(prev => [...prev, newCategory]);
      }

      setFormData({ name: '', description: '', parentId: '', status: 'active' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      parentId: category.parentId || '',
      status: category.status
    });
    setShowAddModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      // Mock API call - replace with actual API
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));

      setFormData({ name: '', description: '', parentId: '', status: 'active' });
      setEditingCategory(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      try {
        // Mock API call - replace with actual API
        setCategories(prev => prev.filter(cat => cat.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCategory = (category: Category, level: number = 0) => (
    <div key={category.id} className={`${level > 0 ? 'ml-6' : ''}`}>
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm mb-2">
        <div className="flex items-center">
          <FolderIcon className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <h3 className="font-medium text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-500">{category.description}</p>
            <div className="flex items-center mt-1 space-x-4">
              <span className="text-xs text-gray-400">
                {category.productCount} ürün
              </span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                category.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {category.status === 'active' ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEditCategory(category)}
            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteCategory(category.id)}
            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {category.children && category.children.length > 0 && (
        <div className="ml-4">
          {category.children.map(child => renderCategory(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kategoriler</h1>
            <p className="text-gray-600">Ürün kategorilerini yönetin ve düzenleyin</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Yeni Kategori
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Kategori ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Yükleniyor...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Kategori bulunamadı</p>
          </div>
        ) : (
          filteredCategories.map(category => renderCategory(category))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kategori adını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kategori açıklaması girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ana Kategori
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Ana kategori (seçin)</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', parentId: '', status: 'active' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
              <button
                onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingCategory ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
