'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, MapPin, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { MasterSheetRow } from '@/lib/excel-export';

interface MasterSheetTableProps {
  rows: MasterSheetRow[];
  loading: boolean;
}

export const MasterSheetTable: React.FC<MasterSheetTableProps> = ({ rows, loading }) => {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleViewDocket = (docketNo: string) => {
    if (!docketNo) return;
    router.push(`/docket/view?docketNo=${encodeURIComponent(docketNo)}`);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase().trim();
    if (s === 'DELIVERED' || s === 'POD RECEIVED' || s === 'COMPLETED') {
      return (
        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded bg-[#22c55e] text-white shadow-sm whitespace-nowrap">
          {s}
        </span>
      );
    }
    if (s.includes('OFD')) {
      return (
        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded bg-blue-600 text-white shadow-sm whitespace-nowrap">
          OFD
        </span>
      );
    }
    if (s.includes('INTRANSIT') || s.includes('IN TRANSIT')) {
      return (
        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded bg-amber-500 text-white shadow-sm whitespace-nowrap">
          IN TRANSIT
        </span>
      );
    }
    if (s.includes('RTO') || s.includes('CANCEL')) {
      return (
        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded bg-red-600 text-white shadow-sm whitespace-nowrap">
          {s}
        </span>
      );
    }
    if (!s || s.toUpperCase() === 'PENDING') {
      return <span className="text-gray-400 font-mono">-</span>;
    }
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 whitespace-nowrap">
        {s}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#f7931d] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading Master Sheet data...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div className="text-5xl mb-3">📊</div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">No Records Found</h3>
        <p className="text-sm text-gray-500">No records match the selected date range or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Table Container with custom scrollbar */}
      <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-sm max-h-[70vh]">
        <table className="w-full border-collapse text-xs text-left">
          <thead className="sticky top-0 z-20 bg-[#002d62] text-white select-none">
            <tr>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] text-center w-12 sticky left-0 bg-[#002d62] z-30">
                Sr.No
              </th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">THROUGH</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">DATE</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap sticky left-12 bg-[#002d62] z-30">
                DOCKET
              </th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">CONSIGNOR</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">CONSIGNEE</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">MODE</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">Road/Air</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">ORIGIN</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] min-w-[240px]">DESTINATION</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">DISTRICT</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">STATE</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">Pin Code</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-center">ODA CHARGES</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-center">BILLED/PAID</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-center">BOXES</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Weight</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Length</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Breadth</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Height</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">Dimension</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Vol. Weight</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Charged weight</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">Invoice No</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-right">Invoice value</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">Contact No</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">F/W</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">AWB NO.</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">F/W NAME</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap text-center">STATUS</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap">DELIVERY DATE</th>
              <th className="px-3 py-3 font-semibold border-r border-[#003d80] whitespace-nowrap min-w-[140px]">REMARKS</th>
              <th className="px-3 py-3 font-semibold text-center sticky right-0 bg-[#002d62] z-30">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => (
              <tr 
                key={`${row.docketNo}-${row.srNo}`}
                className="hover:bg-amber-50/50 transition-colors group"
              >
                {/* Sr.No (Sticky Left) */}
                <td className="px-3 py-2.5 text-center font-medium text-gray-500 border-r border-gray-200 sticky left-0 bg-white group-hover:bg-amber-50/50 z-10">
                  {row.srNo}
                </td>

                {/* THROUGH */}
                <td className="px-3 py-2.5 font-semibold text-gray-800 border-r border-gray-200 whitespace-nowrap">
                  {row.through}
                </td>

                {/* DATE */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.date}
                </td>

                {/* DOCKET (Sticky Left) */}
                <td className="px-3 py-2.5 font-bold text-[#002d62] border-r border-gray-200 whitespace-nowrap sticky left-12 bg-white group-hover:bg-amber-50/50 z-10">
                  <button
                    onClick={() => handleViewDocket(row.docketNo)}
                    className="hover:text-[#f7931d] hover:underline transition flex items-center gap-1"
                    title="View docket details"
                  >
                    <span>{row.docketNo}</span>
                  </button>
                </td>

                {/* CONSIGNOR */}
                <td className="px-3 py-2.5 text-gray-800 font-medium border-r border-gray-200 whitespace-nowrap">
                  {row.consignor || '-'}
                </td>

                {/* CONSIGNEE */}
                <td className="px-3 py-2.5 text-gray-800 font-medium border-r border-gray-200 whitespace-nowrap">
                  {row.consignee || '-'}
                </td>

                {/* MODE */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    row.mode === 'AIR' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {row.mode || 'ROAD'}
                  </span>
                </td>

                {/* Road/Air */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap font-medium">
                  {row.roadAir || row.mode || 'ROAD'}
                </td>

                {/* ORIGIN */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.origin || '-'}
                </td>

                {/* DESTINATION */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 min-w-[240px]">
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span 
                      className={`line-clamp-2 ${row.rawDocket?.image_url ? 'cursor-pointer hover:text-[#f7931d] hover:underline' : ''}`}
                      onClick={() => row.rawDocket?.image_url && setSelectedImage(row.rawDocket.image_url)}
                      title={row.destination}
                    >
                      {row.destination || '-'}
                    </span>
                    {row.rawDocket?.image_url && (
                      <ImageIcon className="w-3 h-3 text-[#f7931d] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </td>

                {/* DISTRICT */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.district || '-'}
                </td>

                {/* STATE */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.state || '-'}
                </td>

                {/* Pin Code */}
                <td className="px-3 py-2.5 font-mono text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.pincode || '-'}
                </td>

                {/* ODA CHARGES */}
                <td className="px-3 py-2.5 text-center text-gray-500 border-r border-gray-200 whitespace-nowrap">
                  {row.odaCharges}
                </td>

                {/* BILLED/PAID */}
                <td className="px-3 py-2.5 text-center text-gray-500 border-r border-gray-200 whitespace-nowrap">
                  {row.billedPaid}
                </td>

                {/* BOXES */}
                <td className="px-3 py-2.5 text-center font-bold text-gray-800 border-r border-gray-200 whitespace-nowrap">
                  {row.boxes}
                </td>

                {/* Weight */}
                <td className="px-3 py-2.5 text-right font-semibold text-gray-800 border-r border-gray-200 whitespace-nowrap">
                  {row.weight || '-'}
                </td>

                {/* Length */}
                <td className="px-3 py-2.5 text-right text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.length || '-'}
                </td>

                {/* Breadth */}
                <td className="px-3 py-2.5 text-right text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.breadth || '-'}
                </td>

                {/* Height */}
                <td className="px-3 py-2.5 text-right text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.height || '-'}
                </td>

                {/* Dimension */}
                <td className="px-3 py-2.5 font-mono text-gray-800 border-r border-gray-200 whitespace-nowrap">
                  {row.dimension || '-'}
                </td>

                {/* Vol. Weight */}
                <td className="px-3 py-2.5 text-right font-mono text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.volWeight > 0 ? row.volWeight : '-'}
                </td>

                {/* Charged weight */}
                <td className="px-3 py-2.5 text-right font-bold text-[#002d62] border-r border-gray-200 whitespace-nowrap">
                  {row.chargedWeight || '-'}
                </td>

                {/* Invoice No */}
                <td className="px-3 py-2.5 font-mono text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.invoiceNo || '-'}
                </td>

                {/* Invoice value */}
                <td className="px-3 py-2.5 text-right font-semibold text-gray-800 border-r border-gray-200 whitespace-nowrap">
                  {row.invoiceValue ? `₹${row.invoiceValue}` : '-'}
                </td>

                {/* Contact No */}
                <td className="px-3 py-2.5 font-mono text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.contactNo || '-'}
                </td>

                {/* F/W */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.fw}
                </td>

                {/* AWB NO. */}
                <td className="px-3 py-2.5 font-mono text-gray-700 border-r border-gray-200 whitespace-nowrap">
                  {row.awbNo || '-'}
                </td>

                {/* F/W NAME */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap font-medium">
                  {row.fwName || '-'}
                </td>

                {/* STATUS (Vibrant colored cell matching sheet) */}
                <td className="px-3 py-2.5 text-center border-r border-gray-200 whitespace-nowrap">
                  {getStatusBadge(row.status)}
                </td>

                {/* DELIVERY DATE */}
                <td className="px-3 py-2.5 text-gray-700 border-r border-gray-200 whitespace-nowrap font-medium">
                  {row.deliveryDate || '-'}
                </td>

                {/* REMARKS */}
                <td className="px-3 py-2.5 text-gray-600 border-r border-gray-200 min-w-[140px] truncate" title={row.remarks}>
                  {row.remarks || '-'}
                </td>

                {/* ACTION (Sticky Right) */}
                <td className="px-3 py-2.5 text-center sticky right-0 bg-white group-hover:bg-amber-50/50 z-10 border-l border-gray-200">
                  <button
                    onClick={() => handleViewDocket(row.docketNo)}
                    className="px-2.5 py-1.5 bg-[#f7931d] text-white rounded font-bold hover:bg-[#e67e00] transition flex items-center justify-center gap-1 mx-auto text-[11px]"
                    title="View docket"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Image Modal for Consignee Address */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-xl"
            >
              ✕
            </button>
            <img 
              src={selectedImage} 
              alt="Address" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
