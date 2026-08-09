
    import fs from 'fs';
    import { defaultCompany, defaultCustomers, defaultProducts, initialInvoices } from './Business_OS/src/data/initialData.js';
    
    const data = {
        company: defaultCompany,
        customers: defaultCustomers,
        products: defaultProducts,
        invoices: initialInvoices
    };
    fs.writeFileSync('temp_db_dump.json', JSON.stringify(data, null, 2));
    