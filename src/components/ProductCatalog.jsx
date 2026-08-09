import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Tag, DollarSign, Save, X, MoreVertical } from 'lucide-react';

export default function ProductCatalog({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [formData, setFormData] = useState({
    styleNo: '',
    name: '',
    category: 'Shirts',
    unit: 'Pcs',
    rate: 100,
    hsnCode: '6205'
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      styleNo: '',
      name: '',
      category: 'Shirts',
      unit: 'Pcs',
      rate: 100,
      hsnCode: '6205'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({ ...prod });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct({ ...formData, id: editingProduct.id });
    } else {
      onAddProduct({ ...formData, id: `prod-${Date.now()}` });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="page-wrapper">
      <div className="form-card">
      <div className="card-header">
        <div className="card-title">
          <Package className="text-indigo-400" size={22} />
          Garment Style & Product Catalog
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Garment Style
        </button>
      </div>

      <div className="items-table-wrapper">
        <table className="items-table list-table">
          <thead>
            <tr>
              <th data-mobile-hide="style">Style No.</th>
              <th>Product Name</th>
              <th>Category</th>
              <th data-mobile-hide="hsn">HSN Code</th>
              <th data-mobile-hide="unit">Unit</th>
              <th style={{ textAlign: 'right' }}>
                <span className="desktop-only-inline">Standard Rate (₹)</span>
                <span className="mobile-only-inline">Rate</span>
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td data-label="Style No." data-mobile-hide="style">
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 'bold',
                    padding: '0.2rem 0.5rem', 
                    background: 'rgba(99, 102, 241, 0.15)', 
                    color: '#818cf8', 
                    borderRadius: '4px' 
                  }}>
                    {p.styleNo || '-'}
                  </span>
                </td>
                <td data-label="Product Name">
                  <strong>{p.name}</strong>
                </td>
                <td data-label="Category">{p.category || 'Garments'}</td>
                <td data-label="HSN Code" data-mobile-hide="hsn">{p.hsnCode || '6205'}</td>
                <td data-label="Unit" data-mobile-hide="unit">{p.unit || 'Pcs'}</td>
                <td data-label="Standard Rate" style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--accent-success)' }}>
                    ₹{Number(p.rate).toLocaleString('en-IN')}
                  </strong>
                </td>
                <td data-label="Actions" style={{ textAlign: 'right', overflow: 'visible' }}>
                  {/* Desktop view actions */}
                  <div className="desktop-actions" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(p)} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-icon" onClick={() => onDeleteProduct(p.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Mobile view actions (3-dots) */}
                  <div className="mobile-actions" style={{ position: 'relative' }}>
                    <button 
                      className={`btn btn-secondary btn-icon ${activeDropdownId === p.id ? 'active' : ''}`}
                      onClick={() => setActiveDropdownId(activeDropdownId === p.id ? null : p.id)}
                      title="Actions Menu"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeDropdownId === p.id && (
                      <>
                        <div 
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                          onClick={() => setActiveDropdownId(null)}
                        />
                        <div className="actions-dropdown-menu" style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          zIndex: 100,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: 'var(--shadow-md)',
                          minWidth: '120px',
                          padding: '0.25rem 0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <button 
                            className="settings-dropdown-item" 
                            onClick={() => { handleOpenEdit(p); setActiveDropdownId(null); }}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <div className="settings-dropdown-divider" />
                          <button 
                            className="settings-dropdown-item text-red-500" 
                            onClick={() => { onDeleteProduct(p.id); setActiveDropdownId(null); }}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={14} style={{ color: '#ef4444' }} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title">
                {editingProduct ? 'Edit Garment Product' : 'Add New Garment Style'}
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Style Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 6610" 
                    value={formData.styleNo} 
                    onChange={e => setFormData({ ...formData, styleNo: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">HSN / SAC Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="6205" 
                    value={formData.hsnCode} 
                    onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Garment Description *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="e.g. Yellow Clothing – Style No. : 6610" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Shirts / Casuals" 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Type</label>
                  <select 
                    className="form-select" 
                    value={formData.unit} 
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Box">Box</option>
                    <option value="Meters">Meters</option>
                    <option value="Dozen">Dozen</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Default Rate (₹) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    value={formData.rate} 
                    onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
