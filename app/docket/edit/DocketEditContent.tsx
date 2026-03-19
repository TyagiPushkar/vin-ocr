// app/docket/edit/DocketEditContent.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, RefreshCw, Download, ChevronLeft, ChevronRight, Menu, X, Home, Save, Edit2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard-header';

interface Shipment {
  Id?: number;
  Length: string;
  Width: string;
  Height: string;
  ActualWeight: string;
  NoOfBox: number;
  BoxType?: string;
  EntryDateTime?: string;
}

interface ApiDocketData {
  Id: number;
  DocketNo: string;
  ConsignorName: string;
  ConsignorAddress: string;
  ConsignorDistrict: string;
  ConsignorState: string;
  ConsignorPinCode: string;
  ConsignorMobile: string;
  ConsigneeName: string;
  ConsigneeAddress: string;
  ConsigneeDistrict: string;
  ConsigneeState: string;
  ConsigneePinCode: string;
  ConsigneeMobile: string;
  ShipDate: string;
  Origin: string;
  Destination: string;
  ModeOfTransport: string;
  InvoiceRequired: string;
  InvoiceNumber: string;
  InvoiceValue: string;
  Declaration: string | null;
  ShipmentType: string;
  PickupDate: string;
  PickupEmployee: string;
  EwayBillNo: string;
  LocationId: number;
  CreatedAt: string;
  shipments?: Shipment[];
  ShipmentCount: number;
}

interface ApiResponse {
  success: boolean;
  count: number;
  data: ApiDocketData[];
}

interface UpdatePayload {
  docketNo: string;
  consignor: {
    name: string;
    address: string;
    district: string;
    state: string;
    pincode: string;
    mobile: string;
  };
  consignee: {
    name: string;
    address: string;
    district: string;
    state: string;
    pincode: string;
    mobile: string;
  };
  shipDate: string;
  origin: string;
  destination: string;
  modeOfTransport: string;
  invoiceRequired: number;
  invoiceNumber: string;
  invoiceValue: number;
  shipmentType: string;
  pickupDate: string;
  pickupEmployee: string;
  ewayBillNo: string;
  locationId: number;
  shipments: Array<{
    length: number;
    width: number;
    height: number;
    actualWeight: number;
    noOfBox: number;
    boxType: string;
  }>;
}

const DocketEditContent = () => {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const docketNo = searchParams.get('docketNo');
  
  const [docket, setDocket] = useState<ApiDocketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    consignor: {
      name: '',
      address: '',
      district: '',
      state: '',
      pincode: '',
      mobile: ''
    },
    consignee: {
      name: '',
      address: '',
      district: '',
      state: '',
      pincode: '',
      mobile: ''
    },
    origin: '',
    destination: '',
    modeOfTransport: 'Road',
    invoiceRequired: 1,
    invoiceNumber: '',
    invoiceValue: 0,
    shipmentType: 'DOX',
    pickupDate: '',
    pickupEmployee: '',
    ewayBillNo: '',
    shipments: [] as Shipment[]
  });

  useEffect(() => {
    if (docketNo) {
      fetchDocketData(docketNo);
    }
  }, [docketNo]);

  useEffect(() => {
    if (docket) {
      // Populate form with docket data
      setFormData({
        consignor: {
          name: docket.ConsignorName || '',
          address: docket.ConsignorAddress || '',
          district: docket.ConsignorDistrict || '',
          state: docket.ConsignorState || '',
          pincode: docket.ConsignorPinCode || '',
          mobile: docket.ConsignorMobile || ''
        },
        consignee: {
          name: docket.ConsigneeName || '',
          address: docket.ConsigneeAddress || '',
          district: docket.ConsigneeDistrict || '',
          state: docket.ConsigneeState || '',
          pincode: docket.ConsigneePinCode || '',
          mobile: docket.ConsigneeMobile || ''
        },
        origin: docket.Origin || '',
        destination: docket.Destination || '',
        modeOfTransport: docket.ModeOfTransport || 'Road',
        invoiceRequired: docket.InvoiceRequired === '1' ? 1 : 0,
        invoiceNumber: docket.InvoiceNumber || '',
        invoiceValue: parseFloat(docket.InvoiceValue) || 0,
        shipmentType: docket.ShipmentType || 'DOX',
        pickupDate: docket.PickupDate ? docket.PickupDate.split('T')[0] : '',
        pickupEmployee: docket.PickupEmployee || '',
        ewayBillNo: docket.EwayBillNo || '',
        shipments: docket.shipments || []
      });
    }
  }, [docket]);

  const fetchDocketData = async (docketNumber: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://namami-infotech.com/vinworld/src/docket/get_docket.php?locationId=${user?.LocationId}&search=${docketNumber}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch docket data');
      }
      
      const result: ApiResponse = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setDocket(result.data[0]);
      } else {
        throw new Error('No docket data found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load docket');
      console.error('Error fetching docket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    section: 'consignor' | 'consignee',
    field: string,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleShipmentChange = (index: number, field: keyof Shipment, value: string | number) => {
    setFormData(prev => {
      const updatedShipments = [...prev.shipments];
      updatedShipments[index] = {
        ...updatedShipments[index],
        [field]: value
      };
      return {
        ...prev,
        shipments: updatedShipments
      };
    });
  };

  const addShipment = () => {
    setFormData(prev => ({
      ...prev,
      shipments: [
        ...prev.shipments,
        {
          Length: '',
          Width: '',
          Height: '',
          ActualWeight: '',
          NoOfBox: 1,
          BoxType: 'Carton'
        }
      ]
    }));
  };

  const removeShipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shipments: prev.shipments.filter((_, i) => i !== index)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.consignor.name || !formData.consignor.mobile) {
      setError('Consignor name and mobile are required');
      return false;
    }
    if (!formData.consignee.name || !formData.consignee.mobile) {
      setError('Consignee name and mobile are required');
      return false;
    }
    if (!formData.origin || !formData.destination) {
      setError('Origin and destination are required');
      return false;
    }
    if (formData.shipments.length === 0) {
      setError('At least one shipment is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Prepare payload
      const payload: UpdatePayload = {
        docketNo: docket?.DocketNo || '',
        consignor: {
          name: formData.consignor.name,
          address: formData.consignor.address,
          district: formData.consignor.district,
          state: formData.consignor.state,
          pincode: formData.consignor.pincode,
          mobile: formData.consignor.mobile
        },
        consignee: {
          name: formData.consignee.name,
          address: formData.consignee.address,
          district: formData.consignee.district,
          state: formData.consignee.state,
          pincode: formData.consignee.pincode,
          mobile: formData.consignee.mobile
        },
        shipDate: formData.pickupDate,
        origin: formData.origin,
        destination: formData.destination,
        modeOfTransport: formData.modeOfTransport,
        invoiceRequired: formData.invoiceRequired,
        invoiceNumber: formData.invoiceNumber,
        invoiceValue: formData.invoiceValue,
        shipmentType: formData.shipmentType,
        pickupDate: formData.pickupDate,
        pickupEmployee: formData.pickupEmployee,
        ewayBillNo: formData.ewayBillNo,
        locationId: user?.LocationId || 1,
        shipments: formData.shipments.map(s => ({
          length: parseFloat(s.Length) || 0,
          width: parseFloat(s.Width) || 0,
          height: parseFloat(s.Height) || 0,
          actualWeight: parseFloat(s.ActualWeight) || 0,
          noOfBox: s.NoOfBox || 1,
          boxType: s.BoxType || 'Carton'
        }))
      };

      // Create form data for API
      const formDataToSend = new FormData();
      formDataToSend.append('data', JSON.stringify(payload));
      
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      // Send update request
      const response = await fetch('https://namami-infotech.com/vinworld/src/docket/update_docket.php', {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage('Docket updated successfully!');
        
        // Refresh docket data
        if (docket?.DocketNo) {
          fetchDocketData(docket.DocketNo);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error(result.message || 'Failed to update docket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update docket');
      console.error('Error updating docket:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002d62] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading docket for editing...</p>
        </div>
      </div>
    );
  }

  if (error && !docket) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Docket</h3>
          <p className="text-gray-600 mb-6">{error || 'Docket not found'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="bg-[#002d62] text-white px-6 py-3 rounded hover:bg-[#001f47] transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded hover:bg-gray-300 transition"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!docket) {
    return null;
  }

  const totalWeight = formData.shipments.reduce((sum, shipment) => {
    return sum + (parseFloat(shipment.ActualWeight) || 0) * (shipment.NoOfBox || 1);
  }, 0);

  return (
      <div className="min-h-screen bg-gray-100">
          <DashboardHeader />
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-[#002d62] text-white">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="text-center">
            <div className="font-bold">Edit Docket #{docket.DocketNo}</div>
            <div className="text-xs opacity-75">Edit Mode</div>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg border border-gray-200">
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  router.push('/dashboard');
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Home size={20} />
                Dashboard
              </button>
              <button
                onClick={() => {
                  router.push(`/docket/view?docketNo=${docket.DocketNo}`);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Edit2 size={20} />
                Switch to View Mode
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-[#002d62] hover:text-[#f7931d] transition"
            >
              <ArrowLeft size={20} />
              Cancel Edit
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/docket/view?docketNo=${docket.DocketNo}`)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300 transition flex items-center gap-2"
              >
                <Edit2 size={16} />
                Switch to View Mode
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-[#f7931d] text-white px-4 py-2 rounded text-sm hover:bg-[#e67e00] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar - Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-40">
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition flex items-center justify-center gap-2"
          >
            <X size={18} />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-[#f7931d] text-white py-3 rounded-lg font-bold hover:bg-[#e67e00] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-6xl mx-auto pb-24 lg:pb-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 lg:p-8 rounded-lg shadow-lg border">
          {/* Company Header */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <img 
              src="https://vinworldexpress.com/assets/img/resource/logo-4.png" 
              alt="VIN WORLD Logo" 
              className="h-20"
            />
            <div className="text-center">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#002d62]">
                VIN WORLD EXPRESS PVT. LTD.
              </h1>
              <p className="text-xs md:text-sm text-gray-700 mt-2">
                K-2/5, Defence Enclave, Mahipalpur, New Delhi - 110037
              </p>
            </div>
          </div>

          {/* Docket Number */}
          <div className="border-t-2 border-b-2 border-[#002d62] py-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  DOCKET NO.
                </label>
                <div className="border-b border-gray-300 pb-1 font-mono text-lg">
                  {docket.DocketNo}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  GSTIN
                </label>
                <div className="border-b border-gray-300 pb-1 font-mono">
                  07AAFVC5603G1ZF
                </div>
              </div>
            </div>
          </div>

          {/* Origin and Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Origin:</h3>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => handleFieldChange('origin', e.target.value)}
                className="w-full border border-gray-300 p-4 rounded focus:outline-none focus:border-[#002d62]"
                placeholder="Enter origin"
              />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Destination:</h3>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => handleFieldChange('destination', e.target.value)}
                className="w-full border border-gray-300 p-4 rounded focus:outline-none focus:border-[#002d62]"
                placeholder="Enter destination"
              />
            </div>
          </div>

          {/* Consignor and Consignee Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Consignor Details */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Consignor Details:</h3>
              <div className="border border-gray-300 p-4 rounded space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Name:
                  </label>
                  <input
                    type="text"
                    value={formData.consignor.name}
                    onChange={(e) => handleInputChange('consignor', 'name', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Mobile:
                  </label>
                  <input
                    type="text"
                    value={formData.consignor.mobile}
                    onChange={(e) => handleInputChange('consignor', 'mobile', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Address:
                  </label>
                  <input
                    type="text"
                    value={formData.consignor.address}
                    onChange={(e) => handleInputChange('consignor', 'address', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      District:
                    </label>
                    <input
                      type="text"
                      value={formData.consignor.district}
                      onChange={(e) => handleInputChange('consignor', 'district', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      State:
                    </label>
                    <input
                      type="text"
                      value={formData.consignor.state}
                      onChange={(e) => handleInputChange('consignor', 'state', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Pincode:
                  </label>
                  <input
                    type="text"
                    value={formData.consignor.pincode}
                    onChange={(e) => handleInputChange('consignor', 'pincode', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
              </div>
            </div>

            {/* Consignee Details */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Consignee Details:</h3>
              <div className="border border-gray-300 p-4 rounded space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Name:
                  </label>
                  <input
                    type="text"
                    value={formData.consignee.name}
                    onChange={(e) => handleInputChange('consignee', 'name', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Mobile:
                  </label>
                  <input
                    type="text"
                    value={formData.consignee.mobile}
                    onChange={(e) => handleInputChange('consignee', 'mobile', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Address:
                  </label>
                  <input
                    type="text"
                    value={formData.consignee.address}
                    onChange={(e) => handleInputChange('consignee', 'address', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      District:
                    </label>
                    <input
                      type="text"
                      value={formData.consignee.district}
                      onChange={(e) => handleInputChange('consignee', 'district', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      State:
                    </label>
                    <input
                      type="text"
                      value={formData.consignee.state}
                      onChange={(e) => handleInputChange('consignee', 'state', e.target.value)}
                      className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Pincode:
                  </label>
                  <input
                    type="text"
                    value={formData.consignee.pincode}
                    onChange={(e) => handleInputChange('consignee', 'pincode', e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mode of Transportation and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Mode of Transportation:</h3>
              <div className="flex flex-wrap gap-6">
                {['Air', 'Road', 'Train'].map((mode) => (
                  <label key={mode} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.modeOfTransport.toLowerCase() === mode.toLowerCase()}
                      onChange={() => handleFieldChange('modeOfTransport', mode)}
                      className="mr-2 h-5 w-5 accent-[#002d62]"
                    />
                    <span className="font-semibold">{mode.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Type:</h3>
              <div className="flex flex-wrap gap-6">
                {['DOX', 'Non-DOX'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.shipmentType.toLowerCase() === type.toLowerCase().replace('-', '')}
                      onChange={() => handleFieldChange('shipmentType', type === 'DOX' ? 'DOX' : 'Non-DOX')}
                      className="mr-2 h-5 w-5 accent-[#002d62]"
                    />
                    <span className="font-semibold">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Pickup Date:
              </label>
              <input
                type="date"
                value={formData.pickupDate}
                onChange={(e) => handleFieldChange('pickupDate', e.target.value)}
                className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-[#002d62]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Pickup Employee:
              </label>
              <input
                type="text"
                value={formData.pickupEmployee}
                onChange={(e) => handleFieldChange('pickupEmployee', e.target.value)}
                className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-[#002d62]"
              />
            </div>
          </div>

          {/* Documents Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                E-WAY BILL NO.:
              </label>
              <input
                type="text"
                value={formData.ewayBillNo}
                onChange={(e) => handleFieldChange('ewayBillNo', e.target.value)}
                className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-[#002d62]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Invoice Number:
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-[#002d62]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Invoice Value (₹):
              </label>
              <input
                type="number"
                value={formData.invoiceValue}
                onChange={(e) => handleFieldChange('invoiceValue', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-[#002d62]"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Upload Document Image (Optional):
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-[#002d62]"
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          {/* Shipments Table */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Shipments</h3>
              <button
                type="button"
                onClick={addShipment}
                className="bg-[#002d62] text-white px-4 py-2 rounded text-sm hover:bg-[#001f47] transition flex items-center gap-2"
              >
                <Plus size={16} />
                Add Shipment
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left font-bold">PIECES</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">ACTUAL WT. (kg)</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">Length (cm)</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">Width (cm)</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">Height (cm)</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">Box Type</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.shipments.map((shipment, index) => (
                    <tr key={shipment.Id || index}>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={shipment.NoOfBox}
                          onChange={(e) => handleShipmentChange(index, 'NoOfBox', parseInt(e.target.value) || 1)}
                          className="w-full p-1 border border-gray-300 rounded"
                          min="1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={shipment.ActualWeight}
                          onChange={(e) => handleShipmentChange(index, 'ActualWeight', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={shipment.Length}
                          onChange={(e) => handleShipmentChange(index, 'Length', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={shipment.Width}
                          onChange={(e) => handleShipmentChange(index, 'Width', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <input
                          type="number"
                          value={shipment.Height}
                          onChange={(e) => handleShipmentChange(index, 'Height', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.1"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <select
                          value={shipment.BoxType || 'Carton'}
                          onChange={(e) => handleShipmentChange(index, 'BoxType', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                        >
                          <option value="Carton">Carton</option>
                          <option value="Box">Box</option>
                          <option value="Pallet">Pallet</option>
                          <option value="Envelope">Envelope</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <button
                          type="button"
                          onClick={() => removeShipment(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.shipments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">
                        No shipments added. Click "Add Shipment" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Weight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                TOTAL WEIGHT:
              </label>
              <div className="border-b border-gray-300 pb-1 font-bold text-lg">
                {totalWeight.toFixed(2)} kg
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                R/T Receiver Name:
              </label>
              <div className="border-b border-gray-300 pb-1">
                {formData.consignee.name}
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="border-t-2 border-[#002d62] pt-6 mt-8">
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                We hereby agree to the terms & conditions printed at the backside of this 
                agreement of carriage and to the Charged Services Charges.
              </p>
              <p>
                I/We declare that information provided by me/us for the preparation of this 
                agreement of this carriage is true and correct. Actual sizes of volumetric 
                packages are mentioned overleaf.
              </p>
            </div>
            
            <div className="mt-6 text-center text-lg font-bold text-red-600">
              NON NEGOTIABLE AT OWNER'S RISK
            </div>
          </div>

          {/* Desktop Save Button (for large screens) */}
          <div className="hidden lg:flex justify-end mt-8">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#f7931d] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#e67e00] transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Spacer for mobile bottom action bar */}
      <div className="h-20 lg:hidden"></div>
    </div>
  );
};

export default DocketEditContent;