import React from 'react';
import { numberToWordsIndian } from '../utils/numberToWords';

const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const formatDate = (dateStr) => {
  if (!dateStr) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function InvoicePaper({ invoice, company, id = 'invoice-paper-element' }) {
  if (!invoice) return null;

  const total = invoice.useCustomTotalAmount && Number(invoice.customTotalAmount) >= 0
    ? Number(invoice.customTotalAmount)
    : (invoice.totalAmount || 0);

  const amountInWords = numberToWordsIndian(total);
  const documentTitle = invoice.documentTitle || 'INVOICE';
  const isDraft = invoice.status === 'Draft';

  // Robust GST Amount determination
  const finalGstAmount = invoice.applyGst !== false
    ? ((invoice.useCustomGstAmount || Number(invoice.customGstAmount) > 0)
      ? Number(invoice.customGstAmount || 0)
      : Number(invoice.gstAmount || (invoice.subtotal * ((invoice.gstRate || 0) / 100)) || 0))
    : 0;

  const showBankDetails = invoice.showBankDetails !== false;
  const showSignature = invoice.showSignature !== false;

  const hasExtraMeta = Boolean(
    invoice.referenceDC || 
    invoice.ewayBillNo || 
    invoice.poNo || 
    invoice.vehicleNo || 
    invoice.lrNo || 
    invoice.agentName
  );

  const hasCustomFields = Boolean(invoice.customFields && invoice.customFields.some(f => f.label && f.value));

  return (
    <div 
      className="invoice-paper-container" 
      id={id} 
      style={{ 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '950px'
      }}
    >
      {/* Draft Watermark */}
      {isDraft && (
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '120px',
          fontWeight: '900',
          color: 'rgba(239, 68, 68, 0.05)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 0,
          userSelect: 'none'
        }}>
          SAMPLE INVOICE
        </div>
      )}

      {/* Main Top & Content Section */}
      <div>
        {/* Top Header */}
        <div className="paper-header">
          <div>
            <div className="company-title-large">{company.name}</div>
            <div className="company-details-text">
              {company.addressLine1}
              {company.addressLine2 && <>, {company.addressLine2}</>}
              {(company.city || company.state || company.pincode) && (
                <>
                  {company.addressLine1 || company.addressLine2 ? ', ' : ''}
                  {[company.city, company.state].filter(Boolean).join(', ')}
                  {company.pincode ? ` - ${company.pincode}` : ''}
                </>
              )}
              <br />
              <strong>Phone:</strong> {company.phone}<br />
              <strong>GSTIN:</strong> {company.gstin}
            </div>
          </div>

          <div className="invoice-title-badge">
            <div className="invoice-title-text" style={{ color: isDraft ? '#ef4444' : '#0f172a' }}>
              {isDraft ? `SAMPLE INVOICE` : documentTitle}
            </div>
            <table className="invoice-meta-table">
              <tbody>
                <tr>
                  <td className="meta-label">{documentTitle}</td>
                  <td><strong>{invoice.invoiceNo || 'Draft'}</strong></td>
                </tr>
                <tr>
                  <td className="meta-label">DATE</td>
                  <td>{formatDate(invoice.date)}</td>
                </tr>
                {invoice.referenceDC && (
                  <tr>
                    <td className="meta-label">REF DC NO.</td>
                    <td>{invoice.referenceDC}</td>
                  </tr>
                )}
                {invoice.ewayBillNo && (
                  <tr>
                    <td className="meta-label">E-WAY BILL</td>
                    <td>{invoice.ewayBillNo}</td>
                  </tr>
                )}
                {invoice.poNo && (
                  <tr>
                    <td className="meta-label">P.O. NO.</td>
                    <td>{invoice.poNo}</td>
                  </tr>
                )}
                {invoice.vehicleNo && (
                  <tr>
                    <td className="meta-label">VEHICLE NO.</td>
                    <td>{invoice.vehicleNo}</td>
                  </tr>
                )}
                {invoice.lrNo && (
                  <tr>
                    <td className="meta-label">L.R. NO.</td>
                    <td>{invoice.lrNo}</td>
                  </tr>
                )}
                {invoice.agentName && (
                  <tr>
                    <td className="meta-label">AGENT</td>
                    <td>{invoice.agentName}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill To & Metadata Section */}
        <div className="bill-to-section" style={{ justifyContent: hasCustomFields ? 'space-between' : 'flex-start' }}>
          <div className="bill-to-box" style={{ flex: '1' }}>
            <h4>BILL TO</h4>
            <div className="customer-name-large">{invoice.customer?.name || 'Customer Name'}</div>
            <div className="customer-address-text">
              {invoice.customer?.address || 'Customer Address'}
              {(invoice.customer?.city || invoice.customer?.state || invoice.customer?.pincode) && (
                <>
                  {invoice.customer?.address ? ', ' : ''}
                  {[invoice.customer.city, invoice.customer.state].filter(Boolean).join(', ')}
                  {invoice.customer?.pincode ? ` - ${invoice.customer.pincode}` : ''}
                </>
              )}
              <br />
              {invoice.customer?.phone && <>Phone: {invoice.customer.phone}<br /></>}
              {invoice.customer?.gstin && <strong>GSTIN: {invoice.customer.gstin}</strong>}
            </div>
          </div>

          {/* Dynamic Custom Fields Box if any */}
          {hasCustomFields && (
            <div style={{ textAlign: 'right', fontSize: '0.825rem', color: '#334155', minWidth: '180px' }}>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.35rem' }}>
                ADDITIONAL BILL INFO
              </h4>
              {invoice.customFields.map((field, idx) => (
                field.label && field.value ? (
                  <div key={idx} style={{ marginBottom: '2px' }}>
                    <strong>{field.label}:</strong> {field.value}
                  </div>
                ) : null
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="paper-table">
          <thead>
            <tr>
              <th style={{ width: '52%' }}>DESCRIPTION</th>
              <th style={{ width: '14%', textAlign: 'center' }}>QUANTITY</th>
              <th style={{ width: '15%', textAlign: 'right' }}>RATE (₹)</th>
              <th style={{ width: '19%', textAlign: 'right' }}>AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.description || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {item.quantity ? item.quantity.toLocaleString('en-IN') : 0}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.rate ? Number(item.rate).toLocaleString('en-IN') : '0'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{item.amount ? Number(item.amount).toLocaleString('en-IN') : '0'}</strong>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>
                  No items added yet.
                </td>
              </tr>
            )}

            {/* Reference DC Row inside table if applicable */}
            {invoice.referenceDC && (
              <tr style={{ fontStyle: 'italic', color: '#475569', backgroundColor: '#f8fafc' }}>
                <td colSpan="4">
                  Refrence DC No. : {invoice.referenceDC}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Amount in Words & Totals Summary */}
        <div className="paper-totals-grid">
          <div className="amount-words-box">
            <div className="amount-words-title">Total Amount in Words:</div>
            <div className="amount-words-content">{amountInWords}</div>
            
            {invoice.gstNote && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#1e293b', fontWeight: '500' }}>
                <strong>GST Details:</strong> {invoice.gstNote}
              </div>
            )}



          </div>

          <table className="paper-summary-table">
            <tbody>
              <tr>
                <td style={{ color: '#64748b' }}>Subtotal:</td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                  ₹{Number(invoice.subtotal || 0).toLocaleString('en-IN')}
                </td>
              </tr>

              {Number(invoice.discountAmount) > 0 && (
                <tr>
                  <td style={{ color: '#64748b' }}>Discount:</td>
                  <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>
                    -₹{Number(invoice.discountAmount).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {Number(invoice.shippingCharges) > 0 && (
                <tr>
                  <td style={{ color: '#64748b' }}>Freight / Shipping:</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>
                    +₹{Number(invoice.shippingCharges).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {Number(invoice.packingCharges) > 0 && (
                <tr>
                  <td style={{ color: '#64748b' }}>Packing Charges:</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>
                    +₹{Number(invoice.packingCharges).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {/* GST BIFURCATION (CGST+SGST OR IGST) */}
              {finalGstAmount > 0 && (() => {
                let isInterState = false;
                if (invoice.gstType === 'IGST') {
                  isInterState = true;
                } else if (invoice.gstType === 'CGST_SGST') {
                  isInterState = false;
                } else {
                  const customerState = (invoice.customer?.state || '').trim().toLowerCase();
                  const companyState = (company.state || 'Karnataka').trim().toLowerCase();
                  isInterState = customerState && companyState && customerState !== companyState;
                }
                
                if (isInterState) {
                  return (
                    <tr>
                      <td style={{ color: '#64748b' }}>IGST (Integrated GST):</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                        +₹{Number(finalGstAmount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                } else {
                  const splitGst = roundToTwo(finalGstAmount / 2);
                  return (
                    <>
                      <tr>
                        <td style={{ color: '#64748b' }}>CGST (Central GST):</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          +₹{splitGst.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: '#64748b' }}>SGST (State GST):</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          +₹{splitGst.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </>
                  );
                }
              })()}

              {Number(invoice.oldBalance) > 0 && (
                <tr>
                  <td style={{ color: '#64748b' }}>Old Balance:</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>
                    +₹{Number(invoice.oldBalance).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              <tr className="grand-total">
                <td>TOTAL:</td>
                <td style={{ textAlign: 'right' }}>
                  ₹{Number(total).toLocaleString('en-IN')}
                </td>
              </tr>

              {invoice.status === 'Partially Paid' && Number(invoice.paidAmount) > 0 && (
                <>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ color: '#15803d', fontWeight: 'bold' }}>Amount Paid:</td>
                    <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 'bold' }}>
                      -₹{Number(invoice.paidAmount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#fff7ed', fontWeight: 'bold' }}>
                    <td style={{ color: '#c2410c' }}>REMAINING BAL:</td>
                    <td style={{ textAlign: 'right', color: '#c2410c', fontSize: '1rem' }}>
                      ₹{Math.max(0, total - Number(invoice.paidAmount)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-width line below totals */}
      <hr style={{ border: 'none', borderTop: '1.5px solid #94a3b8', margin: '0.75rem 0 0 0' }} />

      {/* Bank Details — sits right below the line */}
      {showBankDetails && (
        <div style={{ 
          paddingTop: '0.8rem', 
          paddingBottom: '0.5rem'
        }}>
          <div className="bank-details-box" style={{ width: '60%' }}>
            <h5>BANK DETAILS & CONTACT</h5>
            <div style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#475569' }}>
              <strong>A/C Holder Name:</strong> {company.accountHolder || company.name || 'IVK Garments'}<br />
              <strong>Bank Name:</strong> {company.bankName || 'HDFC Bank'}<br />
              <strong>A/C No:</strong> {company.accountNo || '50200012345678'}<br />
              <strong>IFSC Code:</strong> {company.ifscCode || 'HDFC0001234'}<br />
              {invoice.showContactDetails !== false && (
                <div style={{ marginTop: '0.4rem' }}>
                  If you have any questions about this invoice, please contact<br />
                  <strong>[Name: {company.contactPerson}, Phone: {company.phone}, {company.email}]</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section (Signature + Thank you) pinned to the very bottom */}
      <div style={{ marginTop: 'auto' }}>
        {showSignature && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', paddingRight: '1rem' }}>
            <div className="signatory-box">
              <div className="signatory-line">
                For {company.name}<br />
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>Authorized Signatory</span>
              </div>
            </div>
          </div>
        )}

        {/* Thank you */}
        <div style={{ 
          textAlign: 'center', 
          paddingTop: '0.5rem',
          borderTop: '1.5px solid #e2e8f0', 
          fontWeight: '600', 
          color: '#475569', 
          fontSize: '0.85rem' 
        }}>
          {invoice.notes || 'Thank you for your business!'}
        </div>
      </div>
    </div>
  );
}
