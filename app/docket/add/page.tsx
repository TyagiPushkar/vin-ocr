'use client';

import React from "react"
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import {
  Phone,
  User,
  MapPin,
  Calendar,
  Truck,
  Package,
  FileText,
  Camera,
  X,
  Plus,
  ChevronLeft,
  Check,
  RefreshCw,
  Eye,
  Box,
  Building2,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { DashboardHeader } from "@/components/dashboard-header";
import { resolveDistrictAndState, lookupPincode } from "@/lib/excel-export";

// Box type configurations
const BOX_TYPES = {
  'Small': { length: 10, width: 10, height: 10, label: 'Small (10x10x10)' },
  'Medium': { length: 20, width: 15, height: 15, label: 'Medium (20x15x15)' },
  'Large': { length: 30, width: 20, height: 20, label: 'Large (30x20x20)' },
  'Other': { length: 0, width: 0, height: 0, label: 'Other (Custom Size)' }
} as const;

type BoxType = keyof typeof BOX_TYPES;

interface Shipment {
  id: number;
  boxType: BoxType;
  length: number;
  width: number;
  height: number;
  actualWeight: number;
  noOfBox: number;
  description?: string;
}

interface Consignor {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  pincode: string;
  district: string | null;
  state: string | null;
  status: number;
}

interface ConsignorData {
  ConsignorName: string;
  ConsignorMobile: string;
  ConsignorAddress: string;
  ConsignorDistrict: string;
  ConsignorState: string;
  ConsignorPincode: string;
}

export default function AddDocketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [selectedConsignor, setSelectedConsignor] = useState<string>('manual');
  const [manualConsignor, setManualConsignor] = useState<ConsignorData>({
    ConsignorName: '',
    ConsignorMobile: '',
    ConsignorAddress: '',
    ConsignorDistrict: '',
    ConsignorState: '',
    ConsignorPincode: '',
  });
  const [loadingConsignors, setLoadingConsignors] = useState(true);

  const [formData, setFormData] = useState({
    consigneeName: '',
    consigneeMobile: '',
    consigneeAddress: '',
    consigneeDistrict: '',
    consigneeState: '',
    consigneePincode: '',
    origin: '',
    destination: '',
    modeOfTransport: 'Road',
    invoiceRequired: 'No',
    invoiceNumber: '',
    invoiceValue: '',
    shipmentType: 'Non-DOX',
    pickupDate: '',
    pickupEmployee: '',
    ewayBillNo: '',
  });

  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [ocrText, setOcrText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [capturedImage, setCapturedImage] = useState<File | string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Shipment form state
  const [shipmentForm, setShipmentForm] = useState({
    boxType: 'Small' as BoxType,
    length: 10,
    width: 10,
    height: 10,
    actualWeight: '',
    noOfBox: '1',
  });

  // Fetch consignors on mount
  useEffect(() => {
    setMounted(true);
    fetchConsignors();

    // Set today's date for pickup date default
    const today = new Date().toISOString().slice(0, 16);
    setFormData(prev => ({ ...prev, pickupDate: today }));
  }, []);

  const fetchConsignors = async () => {
    try {
      setLoadingConsignors(true);
      const response = await fetch('https://namami-infotech.com/vinworld/src/consignor/get_consignor.php');
      const data = await response.json();

      if (data.success && data.data) {
        // Filter only active consignors (status === 1)
        const activeConsignors = data.data.filter((c: Consignor) => c.status === 1);
        setConsignors(activeConsignors);
      }
    } catch (error) {
      console.error('Failed to fetch consignors:', error);
    } finally {
      setLoadingConsignors(false);
    }
  };

  const handleConsignorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedConsignor(value);

    if (value !== 'manual') {
      const consignor = consignors.find(c => c.id.toString() === value);
      if (consignor) {
        setManualConsignor({
          ConsignorName: consignor.name || '',
          ConsignorMobile: consignor.phone || '',
          ConsignorAddress: consignor.address || '',
          ConsignorDistrict: consignor.district || '',
          ConsignorState: consignor.state || '',
          ConsignorPincode: consignor.pincode || '',
        });
      }
    } else {
      // Reset manual form when switching to manual entry
      setManualConsignor({
        ConsignorName: '',
        ConsignorMobile: '',
        ConsignorAddress: '',
        ConsignorDistrict: '',
        ConsignorState: '',
        ConsignorPincode: '',
      });
    }
  };

  const handleManualConsignorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setManualConsignor(prev => ({ ...prev, [name]: value }));
  };

  if (!mounted) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };

      // Auto-resolve district and state if pincode is 6 digits
      if (name === 'consigneePincode' && /^\d{6}$/.test(value.trim())) {
        const pin = value.trim();
        const res = resolveDistrictAndState({
          DocketNo: '',
          ShipDate: '',
          ConsigneePinCode: pin,
          ConsigneeAddress: next.consigneeAddress,
          Destination: next.destination
        });
        if (!next.consigneeDistrict && res.district) next.consigneeDistrict = res.district;
        if (!next.consigneeState && res.state) next.consigneeState = res.state;
        if (!next.destination && res.district) next.destination = res.district;

        lookupPincode(pin).then(info => {
          if (info) {
            setFormData(curr => ({
              ...curr,
              consigneeDistrict: curr.consigneeDistrict || info.district || '',
              consigneeState: curr.consigneeState || info.state || '',
              destination: curr.destination || info.district || ''
            }));
          }
        }).catch(() => {});
      }

      return next;
    });

    if (name === 'invoiceRequired') {
      setShowInvoiceFields(value === 'Yes');
    }
  };

  const handleBoxTypeChange = (type: BoxType) => {
    const boxConfig = BOX_TYPES[type];
    setShipmentForm({
      ...shipmentForm,
      boxType: type,
      length: boxConfig.length,
      width: boxConfig.width,
      height: boxConfig.height,
    });
  };

  const addShipment = () => {
    if (shipmentForm.actualWeight && shipmentForm.noOfBox) {
      setShipments([...shipments, {
        id: Date.now(),
        boxType: shipmentForm.boxType,
        length: shipmentForm.length,
        width: shipmentForm.width,
        height: shipmentForm.height,
        actualWeight: parseFloat(shipmentForm.actualWeight),
        noOfBox: parseInt(shipmentForm.noOfBox),
        description: BOX_TYPES[shipmentForm.boxType].label
      }]);
      // Reset form but keep box type as Small
      setShipmentForm({
        boxType: 'Small',
        length: 10,
        width: 10,
        height: 10,
        actualWeight: '',
        noOfBox: '1',
      });
    }
  };

  const removeShipment = (id: number) => {
    setShipments(shipments.filter(s => s.id !== id));
  };

  const preprocessImage = async (file: File): Promise<HTMLCanvasElement> => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const maxWidth = 1200;
    const scale = Math.min(maxWidth / bitmap.width, 1);

    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store the captured image
    setCapturedImage(file);

    // Create image preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setOcrLoading(true);
    setOcrText("");

    try {
      const processedImage = await preprocessImage(file);
      const { data: { text } } = await Tesseract.recognize(
        processedImage,
        "eng",
        { logger: m => console.log(m) }
      );

      setOcrText(text);
      parseAndFillAddress(text);
    } catch (err) {
      console.error(err);
      setOcrText("❌ Failed to read text");
    } finally {
      setOcrLoading(false);
    }
  };

  const removeImage = () => {
    setCapturedImage(null);
    setImagePreview(null);
    setOcrText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseAndFillAddress = (text: string) => {
    const pincodeMatch = text.match(/\b\d{6}\b/);
    const mobileMatch = text.match(/\b\d{10}\b/);

    // Simple name extraction (first line or capitalized words)
    const lines = text.split('\n').filter(line => line.trim());
    const nameMatch = lines[0] || "";

    const pin = pincodeMatch?.[0] || "";
    const res = resolveDistrictAndState({
      DocketNo: '',
      ShipDate: '',
      ConsigneeAddress: text,
      ConsigneePinCode: pin
    });

    setFormData(prev => ({
      ...prev,
      consigneeName: nameMatch,
      consigneeAddress: text,
      consigneePincode: pin,
      consigneeMobile: mobileMatch?.[0] || "",
      consigneeDistrict: prev.consigneeDistrict || res.district || "",
      consigneeState: prev.consigneeState || res.state || "",
      destination: prev.destination || res.district || "",
    }));

    if (pin && /^\d{6}$/.test(pin)) {
      lookupPincode(pin).then(info => {
        if (info) {
          setFormData(curr => ({
            ...curr,
            consigneeDistrict: curr.consigneeDistrict || info.district || '',
            consigneeState: curr.consigneeState || info.state || '',
            destination: curr.destination || info.district || ''
          }));
        }
      }).catch(() => {});
    }
  };

  // File/Blob ko Base64 String me convert karne ke liye helper
  const convertBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        const result = fileReader.result as string;
        // "data:image/jpeg;base64," prefix ko hata kar sirf base64 string pass karenge
        const base64String = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64String);
      };
      fileReader.onerror = (error) => reject(error);
    });
  };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError('');
  //   setSuccess('');

  //   // Validate consignor based on selection
  //   if (selectedConsignor === 'manual') {
  //     const requiredConsignorFields = ['ConsignorName', 'ConsignorMobile', 'ConsignorAddress'];
  //     for (const field of requiredConsignorFields) {
  //       if (!manualConsignor[field as keyof ConsignorData]) {
  //         setError(`Consignor ${field.replace('Consignor', '')} is required for manual entry`);
  //         return;
  //       }
  //     }
  //   }

  //   const required = [
  //     'consigneeName', 'consigneeMobile', 'consigneeAddress',
  //     'origin', 'destination', 'pickupEmployee'
  //   ];

  //   for (const field of required) {
  //     if (!formData[field as keyof typeof formData]) {
  //       setError(`${field.replace(/([A-Z])/g, ' $1')} is required`);
  //       return;
  //     }
  //   }

  //   if (shipments.length === 0) {
  //     setError('Please add at least one shipment');
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     // Get today's date for shipDate
  //     const today = new Date().toISOString().split('T')[0];

  //     // Use selected consignor or manual entry
  //     const consignorData = selectedConsignor !== 'manual'
  //       ? consignors.find(c => c.id.toString() === selectedConsignor)
  //       : null;

  //     // Create FormData object for multipart/form-data
  //     const formDataObj = new FormData();

  //     // Add all the data as JSON string
  //     const payload = {
  //       consignor: {
  //         id: selectedConsignor !== 'manual' ? parseInt(selectedConsignor) : null,
  //         name: selectedConsignor !== 'manual' ? consignorData?.name || '' : manualConsignor.ConsignorName,
  //         address: selectedConsignor !== 'manual' ? consignorData?.address || '' : manualConsignor.ConsignorAddress,
  //         district: selectedConsignor !== 'manual' ? consignorData?.district || '' : manualConsignor.ConsignorDistrict,
  //         state: selectedConsignor !== 'manual' ? consignorData?.state || '' : manualConsignor.ConsignorState,
  //         pincode: selectedConsignor !== 'manual' ? consignorData?.pincode || '' : manualConsignor.ConsignorPincode,
  //         mobile: selectedConsignor !== 'manual' ? consignorData?.phone || '' : manualConsignor.ConsignorMobile,
  //       },
  //       consignee: {
  //         name: formData.consigneeName,
  //         address: formData.consigneeAddress,
  //         district: formData.consigneeDistrict,
  //         state: formData.consigneeState,
  //         pincode: formData.consigneePincode,
  //         mobile: formData.consigneeMobile,
  //       },
  //       shipDate: today,
  //       origin: formData.origin,
  //       destination: formData.destination,
  //       modeOfTransport: formData.modeOfTransport,
  //       invoiceRequired: formData.invoiceRequired,
  //       invoiceNumber: formData.invoiceNumber || '',
  //       invoiceValue: formData.invoiceValue ? parseFloat(formData.invoiceValue) : 0,
  //       shipmentType: formData.shipmentType,
  //       pickupDate: formData.pickupDate,
  //       pickupEmployee: formData.pickupEmployee,
  //       ewayBillNo: formData.ewayBillNo || '',
  //       locationId: user?.LocationId || 1,
  //       shipments: shipments.map(s => ({
  //         length: s.length,
  //         width: s.width,
  //         height: s.height,
  //         actualWeight: s.actualWeight,
  //         noOfBox: s.noOfBox,
  //         boxType: s.boxType
  //       }))
  //     };

  //     // Add the payload as JSON string
  //     formDataObj.append('data', JSON.stringify(payload));

  //     // Add the image if captured
  //     if (capturedImage) {
  //       formDataObj.append('image', capturedImage);
  //     }

  //     //console the l0g
  //     // console.log('Payload:', payload);

  //     // for (const [key, value] of formDataObj.entries()) {
  //     //   console.log(key, value);
  //     // }

  //     const response = await fetch('https://namami-infotech.com/vinworld/src/docket/add_docket.php', {
  //       method: 'POST',
  //       body: formDataObj, // Don't set Content-Type header, browser will set it with boundary
  //     });

  //     const data = await response.json();

  //     if (data.success) {
  //       setSuccess('Docket created successfully!');
  //       setTimeout(() => router.push('/dashboard'), 2000);
  //     } else {
  //       setError(data.message || 'Failed to create docket');
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     setError('Network error. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate consignor based on selection
    if (selectedConsignor === 'manual') {
      const requiredConsignorFields = ['ConsignorName', 'ConsignorMobile', 'ConsignorAddress'];
      for (const field of requiredConsignorFields) {
        if (!manualConsignor[field as keyof ConsignorData]) {
          setError(`Consignor ${field.replace('Consignor', '')} is required for manual entry`);
          return;
        }
      }
    }

    const required = [
      'consigneeName', 'consigneeMobile', 'consigneeAddress',
      'origin', 'destination', 'pickupEmployee'
    ];

    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        setError(`${field.replace(/([A-Z])/g, ' $1')} is required`);
        return;
      }
    }

    if (shipments.length === 0) {
      setError('Please add at least one shipment');
      return;
    }

    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      const consignorData = selectedConsignor !== 'manual'
        ? consignors.find(c => c.id.toString() === selectedConsignor)
        : null;

      // 1. Image ko Base64 string mein convert karein
      let imageBase64: string | null = null;
      if (capturedImage) {
        if (typeof capturedImage === 'string') {
          imageBase64 = capturedImage.includes(',') ? capturedImage.split(',')[1] : capturedImage;
        } else {
          imageBase64 = await convertBase64(capturedImage);
        }
      }

      // 2. Pure Payload Object taiyar karein
      const payload = {
        consignor: {
          id: selectedConsignor !== 'manual' ? parseInt(selectedConsignor) : null,
          name: selectedConsignor !== 'manual' ? consignorData?.name || '' : manualConsignor.ConsignorName,
          address: selectedConsignor !== 'manual' ? consignorData?.address || '' : manualConsignor.ConsignorAddress,
          district: selectedConsignor !== 'manual' ? consignorData?.district || '' : manualConsignor.ConsignorDistrict,
          state: selectedConsignor !== 'manual' ? consignorData?.state || '' : manualConsignor.ConsignorState,
          pincode: selectedConsignor !== 'manual' ? consignorData?.pincode || '' : manualConsignor.ConsignorPincode,
          mobile: selectedConsignor !== 'manual' ? consignorData?.phone || '' : manualConsignor.ConsignorMobile,
        },
        consignee: {
          name: formData.consigneeName,
          address: formData.consigneeAddress,
          district: formData.consigneeDistrict,
          state: formData.consigneeState,
          pincode: formData.consigneePincode,
          mobile: formData.consigneeMobile,
        },
        shipDate: today,
        origin: formData.origin,
        destination: formData.destination,
        modeOfTransport: formData.modeOfTransport,
        invoiceRequired: formData.invoiceRequired,
        invoiceNumber: formData.invoiceNumber || '',
        invoiceValue: formData.invoiceValue ? parseFloat(formData.invoiceValue) : 0,
        shipmentType: formData.shipmentType,
        pickupDate: formData.pickupDate,
        pickupEmployee: formData.pickupEmployee,
        ewayBillNo: formData.ewayBillNo || '',
        locationId: user?.LocationId || 1,
        image_base64: imageBase64, // Backend dwara required key
        shipments: shipments.map(s => ({
          length: s.length,
          width: s.width,
          height: s.height,
          actualWeight: s.actualWeight,
          noOfBox: s.noOfBox,
          boxType: s.boxType
        }))
      };

      // 3. Direct JSON Body & Application/JSON Headers bhejien (FormData hatayein)
      const response = await fetch('https://namami-infotech.com/vinworld/src/docket/add_docket.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Docket created successfully!');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError(data.message || 'Failed to create docket');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      consigneeName: '',
      consigneeMobile: '',
      consigneeAddress: '',
      consigneeDistrict: '',
      consigneeState: '',
      consigneePincode: '',
      origin: '',
      destination: '',
      modeOfTransport: 'Road',
      invoiceRequired: 'No',
      invoiceNumber: '',
      invoiceValue: '',
      shipmentType: 'Non-DOX',
      pickupDate: new Date().toISOString().slice(0, 16),
      pickupEmployee: '',
      ewayBillNo: '',
    });
    setShipments([]);
    setShowInvoiceFields(false);
    setCapturedImage(null);
    setImagePreview(null);
    setOcrText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-[#f7931d]/10 rounded-lg">
        <Icon className="w-5 h-5 text-[#f7931d]" />
      </div>
      <h3 className="text-xl font-bold text-[#002d62]">{title}</h3>
    </div>
  );

  const PreviewCard = () => {
    const getConsignorDisplay = () => {
      if (selectedConsignor !== 'manual') {
        const consignor = consignors.find(c => c.id.toString() === selectedConsignor);
        return consignor ? {
          name: consignor.name,
          mobile: consignor.phone,
          address: consignor.address,
          district: consignor.district,
          state: consignor.state,
          pincode: consignor.pincode,
        } : null;
      }
      return manualConsignor.ConsignorName ? {
        name: manualConsignor.ConsignorName,
        mobile: manualConsignor.ConsignorMobile,
        address: manualConsignor.ConsignorAddress,
        district: manualConsignor.ConsignorDistrict,
        state: manualConsignor.ConsignorState,
        pincode: manualConsignor.ConsignorPincode,
      } : null;
    };

    const consignorDisplay = getConsignorDisplay();

    return (
      <div className={`fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center ${showPreview ? 'block' : 'hidden'}`}>
        <div className="bg-white w-full h-[90vh] md:h-auto md:max-h-[80vh] md:max-w-2xl md:rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#002d62] text-white">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5" />
              <h3 className="font-bold">Docket Preview</h3>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Consignor */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#f7931d] flex items-center gap-2">
                <User className="w-4 h-4" />
                Consignor Details
              </h4>
              {consignorDisplay ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <div className="font-semibold text-[#002d62]">{consignorDisplay.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Mobile:</span>
                    <div className="font-semibold text-[#002d62]">{consignorDisplay.mobile}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Address:</span>
                    <div className="font-semibold text-[#002d62]">{consignorDisplay.address}</div>
                  </div>
                  {(consignorDisplay.district || consignorDisplay.state || consignorDisplay.pincode) && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Location:</span>
                      <div className="font-semibold text-[#002d62]">
                        {[consignorDisplay.district, consignorDisplay.state, consignorDisplay.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">No consignor selected</div>
              )}
            </div>

            {/* Consignee */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#f7931d] flex items-center gap-2">
                <User className="w-4 h-4" />
                Consignee Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <div className="font-semibold text-[#002d62]">{formData.consigneeName || 'Not provided'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Mobile:</span>
                  <div className="font-semibold text-[#002d62]">{formData.consigneeMobile || 'Not provided'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Address:</span>
                  <div className="font-semibold text-[#002d62]">{formData.consigneeAddress || 'Not provided'}</div>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-3">
                  <span className="text-gray-600 text-sm">Captured Image:</span>
                  <div className="mt-2 relative">
                    <img
                      src={imagePreview}
                      alt="Captured consignee address"
                      className="max-h-40 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shipment Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#f7931d] flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Shipment Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">From:</span>
                  <div className="font-semibold text-[#002d62]">{formData.origin || 'Not provided'}</div>
                </div>
                <div>
                  <span className="text-gray-600">To:</span>
                  <div className="font-semibold text-[#002d62]">{formData.destination || 'Not provided'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-semibold text-[#002d62]">{formData.shipmentType}</div>
                </div>
                <div>
                  <span className="text-gray-600">Mode:</span>
                  <div className="font-semibold text-[#002d62]">{formData.modeOfTransport}</div>
                </div>
              </div>
            </div>

            {/* Items */}
            {shipments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-[#f7931d] flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Shipments ({shipments.length})
                </h4>
                <div className="space-y-2">
                  {shipments.map((shipment, idx) => (
                    <div key={shipment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="font-semibold text-[#002d62] mb-1">
                        {idx + 1}. {BOX_TYPES[shipment.boxType].label}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>Weight: {shipment.actualWeight}kg</div>
                        <div>Quantity: {shipment.noOfBox}</div>
                        <div className="col-span-2">Dimensions: {shipment.length} x {shipment.width} x {shipment.height}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowPreview(false)}
              className="w-full bg-[#002d62] text-white py-3 rounded-lg font-bold hover:bg-[#00448c] transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardHeader />
      <div className="min-h-screen bg-gradient-to-b from-[#f7f9fc] to-[#eef2f7]">
        {/* Header */}
        {/* <div className="bg-[#002d62] text-white p-4 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-center flex-1">Create New Docket</h1>
              <div className="w-10" />
            </div>
          </div>
        </div> */}

        <div className="max-w-5xl mx-auto p-4">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <div className="font-semibold">⚠️ {error}</div>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <div className="font-semibold">✅ {success}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Consignor Section - Dropdown with manual option */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <SectionHeader icon={Building2} title="Select Consignor" />

              <div className="mb-6">
                <label className="text-sm font-semibold text-[#002d62] block mb-2">
                  Choose Consignor *
                </label>
                <select
                  value={selectedConsignor}
                  onChange={handleConsignorChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900 appearance-none"
                  disabled={loadingConsignors}
                >
                  <option value="manual">➕ Add Manually</option>
                  {loadingConsignors ? (
                    <option disabled>Loading consignors...</option>
                  ) : (
                    consignors.map((consignor) => (
                      <option key={consignor.id} value={consignor.id}>
                        {consignor.name} - {consignor.phone}
                      </option>
                    ))
                  )}
                </select>
                {loadingConsignors && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#f7931d] border-t-transparent rounded-full animate-spin"></div>
                    Loading consignors...
                  </div>
                )}
              </div>

              {/* Manual Consignor Entry Form */}
              {selectedConsignor === 'manual' && (
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-bold text-[#002d62]">Enter Consignor Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Name *
                      </label>
                      <input
                        type="text"
                        name="ConsignorName"
                        value={manualConsignor.ConsignorName}
                        onChange={handleManualConsignorChange}
                        placeholder="Enter consignor name"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Mobile *
                      </label>
                      <input
                        type="tel"
                        name="ConsignorMobile"
                        value={manualConsignor.ConsignorMobile}
                        onChange={handleManualConsignorChange}
                        placeholder="10-digit mobile"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4" />
                        Address *
                      </label>
                      <textarea
                        name="ConsignorAddress"
                        value={manualConsignor.ConsignorAddress}
                        onChange={handleManualConsignorChange}
                        placeholder="Enter complete address"
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62]">District</label>
                      <input
                        type="text"
                        name="ConsignorDistrict"
                        value={manualConsignor.ConsignorDistrict}
                        onChange={handleManualConsignorChange}
                        placeholder="Enter district"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62]">State</label>
                      <input
                        type="text"
                        name="ConsignorState"
                        value={manualConsignor.ConsignorState}
                        onChange={handleManualConsignorChange}
                        placeholder="Enter state"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62]">Pincode</label>
                      <input
                        type="text"
                        name="ConsignorPincode"
                        value={manualConsignor.ConsignorPincode}
                        onChange={handleManualConsignorChange}
                        placeholder="6-digit pincode"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Upload Section */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="font-bold text-[#002d62] flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Scan Consignee Address with Camera
                </label>
                {ocrLoading && (
                  <div className="text-sm text-[#f7931d] animate-pulse">Processing...</div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleOCRUpload}
                className="hidden"
                id="ocr-upload"
                disabled={ocrLoading}
                ref={fileInputRef}
              />

              {!imagePreview ? (
                <label
                  htmlFor="ocr-upload"
                  className={`block w-full py-3 px-4 text-center rounded-lg border-2 border-dashed ${ocrLoading ? 'border-gray-300 bg-gray-100' : 'border-[#f7931d] bg-[#f7931d]/5 hover:bg-[#f7931d]/10 cursor-pointer transition'
                    }`}
                >
                  {ocrLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#f7931d] border-t-transparent rounded-full animate-spin"></div>
                      Scanning Image...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      Tap to Capture Consignee Address
                    </div>
                  )}
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Captured"
                      className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {ocrText && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <div className="font-semibold text-green-700 mb-1">Address Detected ✓</div>
                      <div className="text-gray-700">Name, mobile and pincode auto-filled from image</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Consignee Section - Fill by scanning */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <SectionHeader icon={User} title="Consignee Details (Scan or Fill)" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="consigneeName"
                    value={formData.consigneeName}
                    onChange={handleInputChange}
                    placeholder="Enter consignee name"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="consigneeMobile"
                    value={formData.consigneeMobile}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    Address *
                  </label>
                  <textarea
                    name="consigneeAddress"
                    value={formData.consigneeAddress}
                    onChange={handleInputChange}
                    placeholder="Enter complete address"
                    rows={3}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62]">District</label>
                  <input
                    type="text"
                    name="consigneeDistrict"
                    value={formData.consigneeDistrict}
                    onChange={handleInputChange}
                    placeholder="Enter district"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62]">State</label>
                  <input
                    type="text"
                    name="consigneeState"
                    value={formData.consigneeState}
                    onChange={handleInputChange}
                    placeholder="Enter state"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62]">Pincode</label>
                  <input
                    type="text"
                    name="consigneePincode"
                    value={formData.consigneePincode}
                    onChange={handleInputChange}
                    placeholder="6-digit pincode"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Shipment Details */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <SectionHeader icon={Truck} title="Shipment Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Origin *
                  </label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleInputChange}
                    placeholder="Origin city"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Destination *
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    placeholder="Destination city"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Mode of Transport *
                  </label>
                  <select
                    name="modeOfTransport"
                    value={formData.modeOfTransport}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  >
                    <option value="Road">Road</option>
                    <option value="Air">Air</option>
                    <option value="Rail">Train</option>
                    <option value="Sea">Sea</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Shipment Type *
                  </label>
                  <select
                    name="shipmentType"
                    value={formData.shipmentType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  >
                    <option value="DOX">DOX</option>
                    <option value="Non-DOX">Non-DOX</option>
                    <option value="Express">Express</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoice Required?
                  </label>
                  <select
                    name="invoiceRequired"
                    value={formData.invoiceRequired}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                {showInvoiceFields && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62]">Invoice Number</label>
                      <input
                        type="text"
                        name="invoiceNumber"
                        value={formData.invoiceNumber}
                        onChange={handleInputChange}
                        placeholder="Invoice number"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#002d62]">Invoice Value (₹)</label>
                      <input
                        type="number"
                        name="invoiceValue"
                        value={formData.invoiceValue}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Pickup Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Pickup Employee *
                  </label>
                  <input
                    type="text"
                    name="pickupEmployee"
                    value={formData.pickupEmployee}
                    onChange={handleInputChange}
                    placeholder="Employee name/code"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#002d62]">E-Way Bill No.</label>
                  <input
                    type="text"
                    name="ewayBillNo"
                    value={formData.ewayBillNo}
                    onChange={handleInputChange}
                    placeholder="E-way bill number"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-2 focus:ring-orange-100 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Shipments Section */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <SectionHeader icon={Package} title="Add Shipments" />

              {shipments.length > 0 && (
                <div className="mb-6 space-y-3">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-[#002d62]">{BOX_TYPES[shipment.boxType].label}</div>
                        <button
                          type="button"
                          onClick={() => removeShipment(shipment.id)}
                          className="p-1 hover:bg-red-100 rounded transition"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium">Weight</span>
                          <span className="text-[#002d62] font-semibold">{shipment.actualWeight} kg</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Dimensions</span>
                          <span className="text-[#002d62] font-semibold">{shipment.length} x {shipment.width} x {shipment.height}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Quantity</span>
                          <span className="text-[#002d62] font-semibold">{shipment.noOfBox}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#002d62]">Box Type *</label>
                    <select
                      value={shipmentForm.boxType}
                      onChange={(e) => handleBoxTypeChange(e.target.value as BoxType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                    >
                      {Object.entries(BOX_TYPES).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {shipmentForm.boxType === 'Other' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#002d62]">Length (cm) *</label>
                        <input
                          type="number"
                          value={shipmentForm.length || ''}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, length: parseFloat(e.target.value) || 0 })}
                          placeholder="Length"
                          min="1"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#002d62]">Width (cm) *</label>
                        <input
                          type="number"
                          value={shipmentForm.width || ''}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, width: parseFloat(e.target.value) || 0 })}
                          placeholder="Width"
                          min="1"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#002d62]">Height (cm) *</label>
                        <input
                          type="number"
                          value={shipmentForm.height || ''}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, height: parseFloat(e.target.value) || 0 })}
                          placeholder="Height"
                          min="1"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#002d62]">Weight (kg) *</label>
                    <input
                      type="number"
                      value={shipmentForm.actualWeight}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, actualWeight: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#002d62]">Quantity *</label>
                    <input
                      type="number"
                      value={shipmentForm.noOfBox}
                      onChange={(e) => setShipmentForm({ ...shipmentForm, noOfBox: e.target.value })}
                      placeholder="1"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addShipment}
                  className="w-full md:w-auto px-6 py-3 bg-[#002d62] text-white rounded-lg font-semibold hover:bg-[#00448c] transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Shipment
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-gradient-to-t from-white to-transparent pt-4 pb-6">
              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="w-full md:flex-1 bg-white border-2 border-[#002d62] text-[#002d62] py-2.5 md:py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <Eye className="w-4 h-4 md:w-5 md:h-5" />
                  Preview
                </button>
                <div className="flex gap-2 w-full md:flex-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-2.5 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-70 flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden xs:inline">Reset</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-[#f7931d] to-[#e67e22] text-white py-2.5 md:py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden xs:inline">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden xs:inline">Submit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Preview Modal */}
          <PreviewCard />
        </div>
      </div>
    </ProtectedRoute>
  );
}