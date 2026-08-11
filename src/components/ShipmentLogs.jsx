import React, { useState, useMemo } from 'react';
import { Truck, Calendar, Search, Plus, Save, X, Edit2, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ShipmentLogs({ shipments = [], customers, onUpdateShipments }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    customerId: '',
    lrNumber: '',
    courierName: '',
    dcNumber: '',
    expectedDelivery: '',
    shippingCost: '',
    brand: '',
    itemName: 'Garments',
    numberOfPieces: '',
    otherStuffs: ''
  });

  const getCustomerName = (id) => {
    const cust = customers.find(c => c.id === id);
    return cust ? cust.name : 'Unknown Client';
  };

  const getCustomerColorBadge = (customerId) => {
    if (!customerId) return { bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.25)', text: '#64748b' };
    let hash = 0;
    for (let i = 0; i < customerId.length; i++) {
      hash = customerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      { bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.25)', text: '#6366f1' }, // Indigo
      { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#3b82f6' }, // Blue
      { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', text: '#10b981' }, // Emerald
      { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' }, // Amber
      { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.25)', text: '#ec4899' }, // Pink
      { bg: 'rgba(14, 165, 233, 0.08)', border: 'rgba(14, 165, 233, 0.25)', text: '#0ea5e9' }  // Sky
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const formatDateSafe = (dateVal) => {
    if (!dateVal) return 'N/A';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) {
      return String(dateVal);
    }
    return date.toLocaleDateString('en-GB');
  };

  // Sort and filter shipments
  const filteredShipments = useMemo(() => {
    return [...shipments]
      .filter(s => {
        const searchStr = `${s.lrNumber || ''} ${s.courierName || ''} ${s.brand || ''} ${s.itemName || ''}`.toLowerCase();
        const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
        const matchesCustomer = filterCustomer ? s.customerId === filterCustomer : true;
        return matchesSearch && matchesCustomer;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.dispatchDate || 0).getTime() - new Date(a.dispatchDate || 0).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.dispatchDate || 0).getTime() - new Date(b.dispatchDate || 0).getTime();
        }
        if (sortBy === 'pcs-desc') {
          return (Number(b.numberOfPieces) || 0) - (Number(a.numberOfPieces) || 0);
        }
        if (sortBy === 'pcs-asc') {
          return (Number(a.numberOfPieces) || 0) - (Number(b.numberOfPieces) || 0);
        }
        return 0;
      });
  }, [shipments, searchTerm, filterCustomer, sortBy]);

  // Group shipments by Month-Year (e.g., "August 2026")
  const groupedShipments = useMemo(() => {
    const groups = {};
    filteredShipments.forEach(ship => {
      if (!ship.dispatchDate) {
        if (!groups['No Date']) {
          groups['No Date'] = [];
        }
        groups['No Date'].push(ship);
        return;
      }
      const date = new Date(ship.dispatchDate);
      if (isNaN(date.getTime())) {
        if (!groups['Invalid Date']) {
          groups['Invalid Date'] = [];
        }
        groups['Invalid Date'].push(ship);
        return;
      }
      const monthName = date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      if (!groups[monthName]) {
        groups[monthName] = [];
      }
      groups[monthName].push(ship);
    });
    return groups;
  }, [filteredShipments]);

  const uniqueBrands = useMemo(() => {
    const brands = shipments.map(s => String(s.brand || '').trim()).filter(Boolean);
    return Array.from(new Set(brands)).sort();
  }, [shipments]);

  const handleOpenModal = () => {
    setEditingShipment(null);
    setFormData({
      id: `ship-${Date.now()}`,
      dispatchDate: new Date().toISOString().split('T')[0],
      customerId: '',
      lrNumber: '',
      courierName: '',
      dcNumber: '',
      expectedDelivery: '',
      shippingCost: '',
      brand: '',
      itemName: 'Garments',
      numberOfPieces: '',
      otherStuffs: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ship) => {
    setEditingShipment(ship);
    setFormData({ ...ship });
    setIsModalOpen(true);
  };

  const handleSaveShipment = async () => {
    if (!formData.customerId) {
      alert("Please select a Client!");
      return;
    }
    
    let newShipments;
    const exists = shipments.some(s => s.id === formData.id);
    if (exists) {
      newShipments = shipments.map(s => s.id === formData.id ? formData : s);
    } else {
      newShipments = [formData, ...shipments];
    }
    
    try {
      await onUpdateShipments(newShipments);
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save shipment: " + err.message);
    }
  };

  const handleDeleteShipment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shipment log?")) return;
    const newShipments = shipments.filter(s => s.id !== id);
    try {
      await onUpdateShipments(newShipments);
    } catch (err) {
      alert("Failed to delete shipment: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredShipments.map(s => {
      const cust = customers.find(c => c.id === s.customerId);
      return {
        'Date': s.dispatchDate,
        'Customer / Brand': cust ? cust.name : s.brand,
        'Brand Name': s.brand,
        'Item Name': s.itemName,
        'Quantity (pcs)': s.numberOfPieces,
        'LR Number': s.lrNumber,
        'Courier Name': s.courierName,
        'Expected Delivery': s.expectedDelivery,
        'Shipping Cost (₹)': s.shippingCost,
        'Remarks': s.otherStuffs
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shipment_Logs');
    XLSX.writeFile(workbook, `IVK_Shipment_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="page-wrapper">
      <div className="form-card">
        <div className="card-header">
          <div className="card-title">
            <Truck className="text-indigo-400" size={22} />
            Shipment Logs
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', width: '100%' }}
              />
            </div>
            
            <select 
              className="form-input" 
              value={filterCustomer} 
              onChange={(e) => setFilterCustomer(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="">All Clients</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select 
              className="form-input" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="pcs-desc">Pcs: Highest First</option>
              <option value="pcs-asc">Pcs: Lowest First</option>
            </select>

            <button className="btn btn-secondary" onClick={handleExportExcel}>
              <Download size={16} /> Export
            </button>
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <Plus size={16} /> Record Shipment
            </button>
          </div>
        </div>

        <div className="items-table-wrapper" style={{ marginTop: '1.5rem' }}>
          {filteredShipments.length === 0 ? (
            <div className="empty-state">
              <Truck size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <h3>No shipments logged</h3>
              <p>Click "Record Shipment" to start tracking your dispatches and LR numbers.</p>
            </div>
          ) : (
            <table className="items-table list-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client Name</th>
                  <th>Sub Brand</th>
                  <th>Pcs</th>
                  <th>DC No</th>
                  <th>Courier / LR No</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedShipments).map(([monthYear, ships]) => (
                  <React.Fragment key={monthYear}>
                    <tr>
                      <td colSpan="6" style={{ 
                        background: 'var(--bg-secondary)', 
                        fontWeight: '700', 
                        fontSize: '0.9rem', 
                        color: 'var(--accent-primary)', 
                        padding: '0.75rem 1rem', 
                        borderBottom: '1px solid var(--border-color)',
                        textAlign: 'center'
                      }}>
                        {monthYear}
                      </td>
                    </tr>
                    {ships.map(ship => {
                      const badge = getCustomerColorBadge(ship.customerId);
                      return (
                        <tr key={ship.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                              <Calendar size={14} />
                              {formatDateSafe(ship.dispatchDate)}
                            </div>
                            {ship.expectedDelivery && (
                              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                                Expected: {formatDateSafe(ship.expectedDelivery)}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ 
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem', 
                              background: badge.bg, 
                              border: `1px solid ${badge.border}`, 
                              color: badge.text, 
                              borderRadius: '4px',
                              fontWeight: '600',
                              fontSize: '0.8rem'
                            }}>
                              {getCustomerName(ship.customerId)}
                            </span>
                          </td>
                          <td style={{ fontWeight: '500' }}>
                            {ship.brand || '-'}
                          </td>
                          <td style={{ fontWeight: 'bold' }}>
                            {ship.numberOfPieces ? `${ship.numberOfPieces.toLocaleString('en-IN')} pcs` : '-'}
                          </td>
                          <td>
                            <span style={{ color: '#475569', fontWeight: '500' }}>{ship.dcNumber || '-'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {(ship.courierName || ship.lrNumber) ? (
                                <>
                                  <Truck size={14} color="#64748b" />
                                  <span>{ship.courierName || 'Courier'}</span>
                                  {ship.lrNumber && <span className="badge badge-secondary" style={{ marginLeft: '0.25rem' }}>{ship.lrNumber}</span>}
                                </>
                              ) : '-'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-icon" 
                              onClick={() => handleOpenEdit(ship)}
                              title="Edit Log"
                              style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="btn btn-icon" 
                              onClick={() => handleDeleteShipment(ship.id)}
                              title="Delete Log"
                              style={{ color: 'var(--accent-danger)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="card-title">
                {editingShipment ? 'Edit Shipment Details' : 'Record New Shipment'}
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Select Client <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="form-input"
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                >
                  <option value="">Select a client...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch Date <span style={{ color: 'red' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input 
                    type="date" 
                    className="form-input"
                    value={formData.dispatchDate}
                    onChange={(e) => setFormData({...formData, dispatchDate: e.target.value})}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">DC Number</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Delivery Challan No."
                  value={formData.dcNumber || ''}
                  onChange={(e) => setFormData({...formData, dcNumber: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Courier / Transport Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. VRL Logistics"
                  value={formData.courierName}
                  onChange={(e) => setFormData({...formData, courierName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LR Number / Tracking ID</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={formData.lrNumber}
                  onChange={(e) => setFormData({...formData, lrNumber: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Delivery Date (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input 
                    type="date" 
                    className="form-input"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({...formData, expectedDelivery: e.target.value})}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input 
                  list="brand-options"
                  className="form-input"
                  placeholder="Select or type new brand..."
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                />
                <datalist id="brand-options">
                  {uniqueBrands.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Item Name / Description</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={formData.itemName}
                  onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Number of Pieces</label>
                <input 
                  type="number" 
                  className="form-input"
                  min="1"
                  value={formData.numberOfPieces}
                  onChange={(e) => setFormData({...formData, numberOfPieces: e.target.value === '' ? '' : Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shipping Cost (₹)</label>
                <input 
                  type="number" 
                  className="form-input"
                  min="0"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({...formData, shippingCost: e.target.value === '' ? '' : Number(e.target.value)})}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Other Stuffs / Notes</label>
                <textarea 
                  className="form-input"
                  rows="2"
                  value={formData.otherStuffs}
                  onChange={(e) => setFormData({...formData, otherStuffs: e.target.value})}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', gridColumn: '1 / -1' }}>
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveShipment}>
                  <Save size={16} /> Save Shipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
