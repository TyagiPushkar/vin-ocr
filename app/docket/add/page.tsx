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
import { resolveDistrictAndState, lookupPincode, getCachedPincodeInfo } from "@/lib/excel-export";

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
  const [loadingConsignorPin, setLoadingConsignorPin] = useState(false);
  const [loadingConsigneePin, setLoadingConsigneePin] = useState(false);

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
        const pin = (consignor.pincode || '').trim().replace(/\D/g, '');
        const district = consignor.district || '';
        const state = consignor.state || '';

        setManualConsignor({
          ConsignorName: consignor.name || '',
          ConsignorMobile: consignor.phone || '',
          ConsignorAddress: consignor.address || '',
          ConsignorDistrict: district,
          ConsignorState: state,
          ConsignorPincode: consignor.pincode || '',
        });

        if (district && !formData.origin) {
          setFormData(prev => ({ ...prev, origin: district }));
        }

        // If consignor has 6-digit pincode but missing district/state, auto lookup via India Post API
        if (pin.length === 6 && (!district || !state)) {
          lookupPincode(pin).then(info => {
            if (info) {
              setManualConsignor(prev => ({
                ...prev,
                ConsignorDistrict: prev.ConsignorDistrict || info.district || '',
                ConsignorState: prev.ConsignorState || info.state || '',
              }));
              setFormData(prev => ({
                ...prev,
                origin: prev.origin || info.district || '',
              }));
            }
          }).catch(() => {});
        }
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

    // Auto-resolve district and state when 6-digit pincode is entered
    if (name === 'ConsignorPincode') {
      const cleanPin = value.trim().replace(/\D/g, '');
      if (cleanPin.length === 6) {
        setLoadingConsignorPin(true);
        lookupPincode(cleanPin)
          .then(info => {
            if (info) {
              setManualConsignor(prev => ({
                ...prev,
                ConsignorDistrict: info.district || prev.ConsignorDistrict,
                ConsignorState: info.state || prev.ConsignorState,
              }));
              setFormData(prev => ({
                ...prev,
                origin: prev.origin || info.district || '',
              }));
            }
          })
          .catch(err => {
            console.warn('Consignor pincode lookup failed:', err);
          })
          .finally(() => {
            setLoadingConsignorPin(false);
          });
      }
    }
  };

  if (!mounted) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'invoiceRequired') {
      setShowInvoiceFields(value === 'Yes');
    }

    // Auto-resolve district and state when 6-digit consignee pincode is entered
    if (name === 'consigneePincode') {
      const cleanPin = value.trim().replace(/\D/g, '');
      if (cleanPin.length === 6) {
        setLoadingConsigneePin(true);
        lookupPincode(cleanPin)
          .then(info => {
            if (info) {
              setFormData(prev => ({
                ...prev,
                consigneeDistrict: info.district || prev.consigneeDistrict,
                consigneeState: info.state || prev.consigneeState,
                destination: prev.destination || info.district || '',
              }));
            }
          })
          .catch(err => {
            console.warn('Consignee pincode lookup failed:', err);
          })
          .finally(() => {
            setLoadingConsigneePin(false);
          });
      }
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
      setLoadingConsigneePin(true);
      lookupPincode(pin)
        .then(info => {
          if (info) {
            setFormData(curr => ({
              ...curr,
              consigneeDistrict: info.district || curr.consigneeDistrict || '',
              consigneeState: info.state || curr.consigneeState || '',
              destination: curr.destination || info.district || '',
            }));
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingConsigneePin(false);
        });
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
      const requiredConsignorFields = ['ConsignorName', 'ConsignorMobile', 'ConsignorAddress', 'ConsignorPincode'];
      for (const field of requiredConsignorFields) {
        if (!manualConsignor[field as keyof ConsignorData]?.trim()) {
          setError(`Consignor ${field.replace('Consignor', '')} is required for manual entry`);
          return;
        }
      }
      if (!/^\d{6}$/.test(manualConsignor.ConsignorPincode.trim())) {
        setError('Consignor Pincode must be a valid 6-digit number');
        return;
      }
    }

    const required = [
      'consigneeName', 'consigneeMobile', 'consigneeAddress', 'consigneePincode',
      'origin', 'destination', 'pickupEmployee'
    ];

    for (const field of required) {
      if (!formData[field as keyof typeof formData]?.trim()) {
        setError(`${field.replace(/([A-Z])/g, ' $1')} is required`);
        return;
      }
    }

    if (!/^\d{6}$/.test(formData.consigneePincode.trim())) {
      setError('Consignee Pincode must be a valid 6-digit number');
      return;
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
    if (selectedConsignor === 'manual') {
      setManualConsignor({
        ConsignorName: '',
        ConsignorMobile: '',
        ConsignorAddress: '',
        ConsignorDistrict: '',
        ConsignorState: '',
        ConsignorPincode: '',
      });
    }
    setShipments([]);
    setShowInvoiceFields(false);
    setCapturedImage(null);
    setImagePreview(null);
    setOcrText('');
    setLoadingConsignorPin(false);
    setLoadingConsigneePin(false);
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
      <div className="bg-[#f4f7fb] p-2.5 sm:p-4 pb-6">
        <div className="max-w-[1440px] mx-auto">
          {/* Messages */}
          {error && (
            <div className="mb-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-sm">
              <span className="font-medium">⚠️ {error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="mb-2.5 p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs sm:text-sm flex items-center justify-between shadow-sm">
              <span className="font-medium">✅ {success}</span>
              <button type="button" onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              
              {/* LEFT COLUMN: Consignor & Consignee */}
              <div className="lg:col-span-6 space-y-3">
                
                {/* 1. Consignor (From) Card */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#f7931d]/10 rounded-lg">
                        <Building2 className="w-4 h-4 text-[#f7931d]" />
                      </div>
                      <h3 className="text-sm font-bold text-[#002d62]">Consignor (From)</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedConsignor}
                        onChange={handleConsignorChange}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-800"
                        disabled={loadingConsignors}
                      >
                        <option value="manual">➕ Add Manually</option>
                        {loadingConsignors ? (
                          <option disabled>Loading...</option>
                        ) : (
                          consignors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} - {c.phone}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {selectedConsignor === 'manual' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[#002d62] block mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="ConsignorName"
                            value={manualConsignor.ConsignorName}
                            onChange={handleManualConsignorChange}
                            placeholder="Consignor name"
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-orange-100 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#002d62] block mb-1">
                            Mobile <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            name="ConsignorMobile"
                            value={manualConsignor.ConsignorMobile}
                            onChange={handleManualConsignorChange}
                            placeholder="10-digit mobile"
                            maxLength={10}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-orange-100 text-gray-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="ConsignorAddress"
                          value={manualConsignor.ConsignorAddress}
                          onChange={handleManualConsignorChange}
                          placeholder="Complete address / street / area"
                          rows={2}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-orange-100 text-gray-900 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-xs font-semibold text-[#002d62] flex items-center justify-between mb-1">
                            <span>Pincode <span className="text-red-500">*</span></span>
                            {loadingConsignorPin && <span className="text-[10px] text-orange-500 animate-pulse font-normal">...</span>}
                          </label>
                          <input
                            type="text"
                            name="ConsignorPincode"
                            value={manualConsignor.ConsignorPincode}
                            onChange={handleManualConsignorChange}
                            placeholder="6-digit"
                            maxLength={6}
                            required
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#002d62] block mb-1">District</label>
                          <input
                            type="text"
                            name="ConsignorDistrict"
                            value={manualConsignor.ConsignorDistrict}
                            onChange={handleManualConsignorChange}
                            placeholder="Auto-filled"
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#002d62] block mb-1">State</label>
                          <input
                            type="text"
                            name="ConsignorState"
                            value={manualConsignor.ConsignorState}
                            onChange={handleManualConsignorChange}
                            placeholder="Auto-filled"
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700 flex flex-wrap items-center justify-between gap-1.5">
                      <div>
                        <span className="font-bold text-[#002d62] text-sm">{manualConsignor.ConsignorName}</span>
                        <span className="text-gray-500 ml-2 font-medium">({manualConsignor.ConsignorMobile})</span>
                        <div className="text-gray-600 mt-1">{manualConsignor.ConsignorAddress}</div>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded text-xs border border-blue-200">
                        {manualConsignor.ConsignorDistrict || '-'}, {manualConsignor.ConsignorState || '-'} ({manualConsignor.ConsignorPincode || '-'})
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Consignee (To) Card with Integrated OCR Scan */}
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#f7931d]/10 rounded-lg">
                        <User className="w-4 h-4 text-[#f7931d]" />
                      </div>
                      <h3 className="text-sm font-bold text-[#002d62]">Consignee Details (To)</h3>
                    </div>

                    {/* Integrated OCR Button in header */}
                    <div className="flex items-center gap-2">
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
                      <label
                        htmlFor="ocr-upload"
                        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition shadow-sm ${
                          ocrLoading
                            ? 'bg-gray-100 text-gray-400 border-gray-300'
                            : 'bg-orange-50 text-[#f7931d] border-orange-200 hover:bg-[#f7931d] hover:text-white'
                        }`}
                      >
                        {ocrLoading ? (
                          <>
                            <div className="w-3 h-3 border-2 border-[#f7931d] border-t-transparent rounded-full animate-spin" />
                            <span>Scanning...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            <span>Scan Photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Scanned photo chip */}
                  {imagePreview && (
                    <div className="mb-2.5 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-xs text-green-800">
                      <div className="flex items-center gap-2">
                        <img src={imagePreview} alt="OCR" className="w-7 h-7 object-cover rounded border border-green-300" />
                        <span className="font-medium text-xs">Address auto-detected from photo ✓</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-red-500 hover:text-red-700 font-bold p-1"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="consigneeName"
                          value={formData.consigneeName}
                          onChange={handleInputChange}
                          placeholder="Receiver name"
                          required
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-orange-100 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="consigneeMobile"
                          value={formData.consigneeMobile}
                          onChange={handleInputChange}
                          placeholder="10-digit mobile"
                          maxLength={10}
                          required
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-orange-100 text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#002d62] block mb-1">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="consigneeAddress"
                        value={formData.consigneeAddress}
                        onChange={handleInputChange}
                        placeholder="Complete delivery address"
                        rows={2}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] focus:ring-1 focus:ring-orange-100 text-gray-900 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] flex items-center justify-between mb-1">
                          <span>Pincode <span className="text-red-500">*</span></span>
                          {loadingConsigneePin && <span className="text-[10px] text-orange-500 animate-pulse font-normal">...</span>}
                        </label>
                        <input
                          type="text"
                          name="consigneePincode"
                          value={formData.consigneePincode}
                          onChange={handleInputChange}
                          placeholder="6-digit"
                          maxLength={6}
                          required
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">District</label>
                        <input
                          type="text"
                          name="consigneeDistrict"
                          value={formData.consigneeDistrict}
                          onChange={handleInputChange}
                          placeholder="Auto-filled"
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">State</label>
                        <input
                          type="text"
                          name="consigneeState"
                          value={formData.consigneeState}
                          onChange={handleInputChange}
                          placeholder="Auto-filled"
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Logistics & Shipments & Action Buttons */}
              <div className="lg:col-span-6 space-y-3.5">
                
                {/* 3. Logistics & Transit Card */}
                <div className="bg-white rounded-xl p-3.5 sm:p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-[#f7931d]/10 rounded-lg">
                      <Truck className="w-4 h-4 text-[#f7931d]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#002d62]">Logistics & Transit</h3>
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Origin <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="origin"
                          value={formData.origin}
                          onChange={handleInputChange}
                          placeholder="Origin city"
                          required
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Destination <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="destination"
                          value={formData.destination}
                          onChange={handleInputChange}
                          placeholder="Destination city"
                          required
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Mode <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="modeOfTransport"
                          value={formData.modeOfTransport}
                          onChange={handleInputChange}
                          required
                          className="w-full px-2.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900 font-medium"
                        >
                          <option value="Road">Road</option>
                          <option value="Air">Air</option>
                          <option value="Rail">Train</option>
                          <option value="Sea">Sea</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="shipmentType"
                          value={formData.shipmentType}
                          onChange={handleInputChange}
                          required
                          className="w-full px-2.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900 font-medium"
                        >
                          <option value="Non-DOX">Non-DOX</option>
                          <option value="DOX">DOX</option>
                          <option value="Express">Express</option>
                          <option value="Standard">Standard</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">Invoice?</label>
                        <select
                          name="invoiceRequired"
                          value={formData.invoiceRequired}
                          onChange={handleInputChange}
                          className="w-full px-2.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900 font-medium"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    {showInvoiceFields && (
                      <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-orange-50/50 border border-orange-100 rounded-lg">
                        <div>
                          <label className="text-[11px] font-semibold text-[#002d62] block mb-1">Invoice Number</label>
                          <input
                            type="text"
                            name="invoiceNumber"
                            value={formData.invoiceNumber}
                            onChange={handleInputChange}
                            placeholder="INV-1234"
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#002d62] block mb-1">Invoice Value (₹)</label>
                          <input
                            type="number"
                            name="invoiceValue"
                            value={formData.invoiceValue}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-[#f7931d]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Pickup Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="pickupDate"
                          value={formData.pickupDate}
                          onChange={handleInputChange}
                          required
                          className="w-full px-2 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Pickup Emp <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="pickupEmployee"
                          value={formData.pickupEmployee}
                          onChange={handleInputChange}
                          placeholder="Emp name"
                          required
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">E-Way Bill</label>
                        <input
                          type="text"
                          name="ewayBillNo"
                          value={formData.ewayBillNo}
                          onChange={handleInputChange}
                          placeholder="Optional"
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d] text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Packages / Shipments Card with Integrated Actions */}
                <div className="bg-white rounded-xl p-3.5 sm:p-4 shadow-sm border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#f7931d]/10 rounded-lg">
                        <Package className="w-4 h-4 text-[#f7931d]" />
                      </div>
                      <h3 className="text-sm font-bold text-[#002d62]">
                        Shipments / Boxes <span className="text-red-500">*</span>
                      </h3>
                    </div>
                    {shipments.length > 0 && (
                      <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-800 font-bold rounded-full border border-blue-200">
                        {shipments.reduce((sum, s) => sum + (Number(s.noOfBox) || 1), 0)} Box | {shipments.reduce((sum, s) => sum + (Number(s.actualWeight) || 0) * (Number(s.noOfBox) || 1), 0).toFixed(1)} kg
                      </span>
                    )}
                  </div>

                  {/* Add box inputs */}
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">Box Type</label>
                        <select
                          value={shipmentForm.boxType}
                          onChange={(e) => handleBoxTypeChange(e.target.value as BoxType)}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d]"
                        >
                          {Object.entries(BOX_TYPES).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Weight (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={shipmentForm.actualWeight}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, actualWeight: e.target.value })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#002d62] block mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={shipmentForm.noOfBox}
                          onChange={(e) => setShipmentForm({ ...shipmentForm, noOfBox: e.target.value })}
                          placeholder="1"
                          min="1"
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#f7931d]"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={addShipment}
                          className="w-full py-2 px-3 bg-[#002d62] text-white text-xs font-bold rounded-lg hover:bg-[#00448c] transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Box</span>
                        </button>
                      </div>
                    </div>

                    {shipmentForm.boxType === 'Other' && (
                      <div className="grid grid-cols-3 gap-2.5 pt-1.5 border-t border-gray-200">
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-0.5">Length (cm)</label>
                          <input
                            type="number"
                            value={shipmentForm.length || ''}
                            onChange={(e) => setShipmentForm({ ...shipmentForm, length: parseFloat(e.target.value) || 0 })}
                            placeholder="L"
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-0.5">Width (cm)</label>
                          <input
                            type="number"
                            value={shipmentForm.width || ''}
                            onChange={(e) => setShipmentForm({ ...shipmentForm, width: parseFloat(e.target.value) || 0 })}
                            placeholder="W"
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-gray-600 block mb-0.5">Height (cm)</label>
                          <input
                            type="number"
                            value={shipmentForm.height || ''}
                            onChange={(e) => setShipmentForm({ ...shipmentForm, height: parseFloat(e.target.value) || 0 })}
                            placeholder="H"
                            className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Added boxes list */}
                  {shipments.length > 0 ? (
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {shipments.map((s, idx) => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 flex items-center justify-center bg-white font-bold rounded-full text-[10px] text-[#002d62] border">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-gray-800">{BOX_TYPES[s.boxType].label}</span>
                            <span className="text-gray-500 text-[11px]">({s.length}×{s.width}×{s.height})</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[#002d62]">{s.actualWeight} kg × {s.noOfBox}</span>
                            <button
                              type="button"
                              onClick={() => removeShipment(s.id)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title="Delete"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      Add at least 1 box above
                    </div>
                  )}

                  {/* Action Buttons Directly Inside Right Panel */}
                  <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="flex-1 py-2.5 px-3 bg-white border border-[#002d62] text-[#002d62] text-xs sm:text-sm font-bold rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={loading}
                      className="py-2.5 px-3.5 bg-gray-100 border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-[#f7931d] to-[#e67e22] text-white text-xs sm:text-sm font-bold rounded-lg hover:shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Create Docket</span>
                        </>
                      )}
                    </button>
                  </div>
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