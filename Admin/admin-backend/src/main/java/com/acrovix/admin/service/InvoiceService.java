package com.acrovix.admin.service;

import com.acrovix.admin.dto.InvoiceItemRequest;
import com.acrovix.admin.dto.InvoiceItemResponse;
import com.acrovix.admin.dto.InvoiceRequest;
import com.acrovix.admin.dto.InvoiceResponse;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.util.AmountToWordsConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final QuotationRepository quotationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductServiceRepository productServiceRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final AdminActivityRepository activityRepository;
    private final NotificationService notificationService;
    private final PdfService pdfService;

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> searchInvoices(InvoiceType type, InvoiceStatus status, String search, Pageable pageable) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        Page<Invoice> invoices = invoiceRepository.searchInvoices(type, status, cleanSearch, pageable);
        return invoices.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceResponseById(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceById(Long id, AdminUser admin) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
    }

    @Transactional
    public Invoice createDraftInvoice(InvoiceRequest request, AdminUser admin) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceType(request.getInvoiceType());
        invoice.setInvoiceDate(request.getInvoiceDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setPaymentTerms(request.getPaymentTerms());
        invoice.setTermsAndConditions(request.getTermsAndConditions());
        invoice.setPlaceOfSupply(request.getPlaceOfSupply());
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setLocked(false);
        invoice.setCreatedBy(admin);

        if (request.getQuotationId() != null) {
            Quotation quotation = quotationRepository.findById(request.getQuotationId())
                    .orElseThrow(() -> new IllegalArgumentException("Quotation not found"));
            if (!"ACCEPTED".equals(quotation.getStatus()) && !"CONVERTED".equals(quotation.getStatus())) {
                throw new IllegalStateException("Invoice can only be created from ACCEPTED or CONVERTED quotation");
            }
            invoice.setQuotation(quotation);
            invoice.setCurrency(quotation.getCurrency());
        }

        if (request.getPurchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found"));
            if (po.getStatus() != PurchaseOrderStatus.VERIFIED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
                throw new IllegalStateException("Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Order");
            }
            invoice.setPurchaseOrder(po);
            invoice.setCurrency(po.getCurrency());
        }

        if (invoice.getCurrency() == null) {
            invoice.setCurrency(request.getCurrency() != null ? request.getCurrency() : Currency.INR);
        }
        if (request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
            invoice.setCustomer(customer);
            invoice.setClientName(customer.getName());
            invoice.setClientCompany(customer.getCompanyName());
            invoice.setClientEmail(customer.getEmail());
            invoice.setClientPhone(customer.getPhone());
            invoice.setClientAddress(customer.getBillingAddress());
            invoice.setClientGstin(customer.getGstin());
            if (invoice.getPlaceOfSupply() == null || invoice.getPlaceOfSupply().isEmpty()) {
                invoice.setPlaceOfSupply(customer.getState());
            }
        }

        // Allow explicit request fields to set/override client snapshot fields
        if (request.getClientName() != null) invoice.setClientName(request.getClientName());
        if (request.getClientCompany() != null) invoice.setClientCompany(request.getClientCompany());
        if (request.getClientEmail() != null) invoice.setClientEmail(request.getClientEmail());
        if (request.getClientPhone() != null) invoice.setClientPhone(request.getClientPhone());
        if (request.getClientAddress() != null) invoice.setClientAddress(request.getClientAddress());
        if (request.getClientGstin() != null) invoice.setClientGstin(request.getClientGstin());

        // Snapshot Supplier
        CompanySettings settings = companySettingsRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Company settings not configured"));
        invoice.setSupplierCompany(settings.getLegalName() != null ? settings.getLegalName() : settings.getCompanyName());
        invoice.setSupplierAddress(settings.getRegisteredAddress());
        invoice.setSupplierGstin(settings.getGstin());
        invoice.setSupplierState(settings.getState());

        if (request.getQuotationId() != null) {
            Quotation quotation = quotationRepository.findById(request.getQuotationId())
                    .orElseThrow(() -> new IllegalArgumentException("Quotation not found"));
            if (!"ACCEPTED".equals(quotation.getStatus()) && !"CONVERTED".equals(quotation.getStatus())) {
                throw new IllegalStateException("Invoice can only be created from ACCEPTED or CONVERTED quotation");
            }
            invoice.setQuotation(quotation);
        }

        if (request.getPurchaseOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(request.getPurchaseOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found"));
            if (po.getStatus() != PurchaseOrderStatus.VERIFIED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
                throw new IllegalStateException("Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Order");
            }
            invoice.setPurchaseOrder(po);
        }

        calculateAndSetTotals(invoice, request.getItems());

        if (invoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(invoice);
        }

        Invoice saved = invoiceRepository.save(invoice);
        logActivity(admin.getId(), "Created Draft Invoice", "Invoice", saved.getId());
        return saved;
    }

    @Transactional
    public Invoice updateDraftInvoice(Long id, InvoiceRequest request, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        if (invoice.isLocked() || invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Cannot update an issued or locked invoice");
        }

        if (request.getInvoiceType() != null) {
            invoice.setInvoiceType(request.getInvoiceType());
        }
        if (request.getInvoiceDate() != null) {
            invoice.setInvoiceDate(request.getInvoiceDate());
        }
        invoice.setDueDate(request.getDueDate());
        invoice.setPaymentTerms(request.getPaymentTerms());
        invoice.setTermsAndConditions(request.getTermsAndConditions());
        invoice.setPlaceOfSupply(request.getPlaceOfSupply());

        if (request.getClientName() != null) invoice.setClientName(request.getClientName());
        if (request.getClientCompany() != null) invoice.setClientCompany(request.getClientCompany());
        if (request.getClientEmail() != null) invoice.setClientEmail(request.getClientEmail());
        if (request.getClientPhone() != null) invoice.setClientPhone(request.getClientPhone());
        if (request.getClientAddress() != null) invoice.setClientAddress(request.getClientAddress());
        if (request.getClientGstin() != null) invoice.setClientGstin(request.getClientGstin());

        calculateAndSetTotals(invoice, request.getItems());

        if (invoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(invoice);
        }

        Invoice saved = invoiceRepository.save(invoice);
        logActivity(admin.getId(), "Updated Draft Invoice details", "Invoice", saved.getId());
        return saved;
    }

    @Transactional
    public Invoice issueInvoice(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        if (invoice.isLocked() || invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Invoice is already issued or not in DRAFT state");
        }

        if (invoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(invoice);
        }

        String nextNumber = sequenceGeneratorService.generateNextInvoiceNumber(invoice.getInvoiceType(), invoice.getInvoiceDate());
        invoice.setInvoiceNumber(nextNumber);
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setLocked(true);
        invoice.setIssuedAt(LocalDateTime.now());

        Invoice saved = invoiceRepository.save(invoice);

        logActivity(admin.getId(), "Issued Invoice: " + saved.getInvoiceNumber(), "Invoice", saved.getId());
        
        // Optionally update PO status if fully invoiced - deferred to Phase 5 or handle simply:
        if (saved.getPurchaseOrder() != null) {
            PurchaseOrder po = saved.getPurchaseOrder();
            if (po.getStatus() == PurchaseOrderStatus.VERIFIED) {
                po.setStatus(PurchaseOrderStatus.PARTIALLY_FULFILLED);
                purchaseOrderRepository.save(po);
            }
        }

        return saved;
    }

    @Transactional
    public Invoice cancelInvoice(Long id, AdminUser admin) {
        Invoice invoice = getInvoiceById(id, admin);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Invoice is already cancelled");
        }
        
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelledAt(LocalDateTime.now());
        // Do not unlock the invoice. It remains locked.
        
        Invoice saved = invoiceRepository.save(invoice);
        logActivity(admin.getId(), "Cancelled Invoice: " + (saved.getInvoiceNumber() != null ? saved.getInvoiceNumber() : "Draft"), "Invoice", saved.getId());
        return saved;
    }

    private void calculateAndSetTotals(Invoice invoice, List<InvoiceItemRequest> itemRequests) {
        boolean isIntraState = isIntraState(invoice.getSupplierGstin(), invoice.getSupplierState(), invoice.getClientGstin(), invoice.getPlaceOfSupply());

        if (itemRequests != null) {
            invoice.getItems().clear();

            BigDecimal subtotal = BigDecimal.ZERO;
            BigDecimal totalDiscount = BigDecimal.ZERO;
            BigDecimal totalTaxable = BigDecimal.ZERO;
            BigDecimal totalCgst = BigDecimal.ZERO;
            BigDecimal totalSgst = BigDecimal.ZERO;
            BigDecimal totalIgst = BigDecimal.ZERO;
            BigDecimal totalTax = BigDecimal.ZERO;

            int sortOrder = 0;
            for (InvoiceItemRequest req : itemRequests) {
                InvoiceItem item = new InvoiceItem();
                item.setInvoice(invoice);
                item.setSku(req.getSku());
                item.setDescription(req.getDescription());
                item.setHsnSac(req.getHsnSac());
                item.setQuantity(req.getQuantity() != null ? req.getQuantity() : BigDecimal.ZERO);
                item.setUnit(req.getUnit());
                
                BigDecimal unitPrice = req.getUnitPrice() != null ? req.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal listPrice = req.getListPrice() != null ? req.getListPrice() : unitPrice;
                BigDecimal discountPct = req.getDiscountPercent() != null ? req.getDiscountPercent() : BigDecimal.ZERO;
                BigDecimal taxPct = req.getTaxPercent() != null ? req.getTaxPercent() : BigDecimal.ZERO;

                item.setUnitPrice(unitPrice);
                item.setListPrice(listPrice);
                item.setDiscountPercent(discountPct);
                item.setTaxPercent(taxPct);
                item.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : sortOrder++);

                if (req.getProductServiceId() != null) {
                    productServiceRepository.findById(req.getProductServiceId()).ifPresent(item::setProductService);
                }

                // Financial Calculation
                BigDecimal grossLineAmount = item.getQuantity().multiply(listPrice).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineDiscount = grossLineAmount.multiply(discountPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                BigDecimal taxable = grossLineAmount.subtract(lineDiscount);
                
                BigDecimal lineTax = taxable.multiply(taxPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                
                item.setTaxableAmount(taxable);
                item.setTaxAmount(lineTax);

                if (taxPct.compareTo(BigDecimal.ZERO) > 0) {
                    if (isIntraState) {
                        BigDecimal halfTax = lineTax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                        item.setCgstAmount(halfTax);
                        item.setSgstAmount(halfTax);
                        item.setIgstAmount(BigDecimal.ZERO);
                    } else {
                        item.setCgstAmount(BigDecimal.ZERO);
                        item.setSgstAmount(BigDecimal.ZERO);
                        item.setIgstAmount(lineTax);
                    }
                }

                item.setLineTotal(taxable.add(lineTax));
                invoice.getItems().add(item);

                subtotal = subtotal.add(taxable);
                totalDiscount = totalDiscount.add(lineDiscount);
                totalTaxable = totalTaxable.add(taxable);
                totalCgst = totalCgst.add(item.getCgstAmount());
                totalSgst = totalSgst.add(item.getSgstAmount());
                totalIgst = totalIgst.add(item.getIgstAmount());
                totalTax = totalTax.add(item.getTaxAmount());
            }

            invoice.setSubtotal(totalTaxable);
            invoice.setDiscountAmount(totalDiscount);
            invoice.setTaxableAmount(totalTaxable);
            invoice.setCgstAmount(totalCgst);
            invoice.setSgstAmount(totalSgst);
            invoice.setIgstAmount(totalIgst);
            invoice.setTaxAmount(totalTax);
            
            BigDecimal grandTotal = totalTaxable.add(totalTax);
            invoice.setGrandTotal(grandTotal);
            invoice.setBalanceDue(grandTotal);
            invoice.setAmountInWords(AmountToWordsConverter.convert(grandTotal));
        } else if (invoice.getItems() != null && !invoice.getItems().isEmpty()) {
            // Recalculate CGST/SGST vs IGST split for existing items if client GSTIN/State changed
            BigDecimal totalCgst = BigDecimal.ZERO;
            BigDecimal totalSgst = BigDecimal.ZERO;
            BigDecimal totalIgst = BigDecimal.ZERO;

            for (InvoiceItem item : invoice.getItems()) {
                BigDecimal lineTax = item.getTaxAmount() != null ? item.getTaxAmount() : BigDecimal.ZERO;
                if (lineTax.compareTo(BigDecimal.ZERO) > 0) {
                    if (isIntraState) {
                        BigDecimal halfTax = lineTax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
                        item.setCgstAmount(halfTax);
                        item.setSgstAmount(halfTax);
                        item.setIgstAmount(BigDecimal.ZERO);
                    } else {
                        item.setCgstAmount(BigDecimal.ZERO);
                        item.setSgstAmount(BigDecimal.ZERO);
                        item.setIgstAmount(lineTax);
                    }
                } else {
                    item.setCgstAmount(BigDecimal.ZERO);
                    item.setSgstAmount(BigDecimal.ZERO);
                    item.setIgstAmount(BigDecimal.ZERO);
                }
                totalCgst = totalCgst.add(item.getCgstAmount());
                totalSgst = totalSgst.add(item.getSgstAmount());
                totalIgst = totalIgst.add(item.getIgstAmount());
            }

            invoice.setCgstAmount(totalCgst);
            invoice.setSgstAmount(totalSgst);
            invoice.setIgstAmount(totalIgst);
        }
    }

    private boolean isIntraState(String supplierGstin, String supplierState, String clientGstin, String placeOfSupply) {
        if (supplierGstin != null && supplierGstin.length() >= 2 && clientGstin != null && clientGstin.length() >= 2) {
            return supplierGstin.substring(0, 2).equals(clientGstin.substring(0, 2));
        }
        if (supplierState != null && placeOfSupply != null) {
            return supplierState.trim().equalsIgnoreCase(placeOfSupply.trim());
        }
        // Default to inter-state if unsure, or intra-state. Standard is intra if identical.
        return true;
    }

    @Transactional
    public Invoice convertProformaToTaxInvoice(Long proformaId, AdminUser admin) {
        Invoice proforma = getInvoiceById(proformaId, admin);
        if (proforma.getInvoiceType() != InvoiceType.PROFORMA) {
            throw new IllegalStateException("Can only convert a PROFORMA invoice");
        }
        
        Invoice taxInvoice = new Invoice();
        taxInvoice.setInvoiceType(InvoiceType.TAX_INVOICE);
        taxInvoice.setStatus(InvoiceStatus.DRAFT);
        taxInvoice.setLocked(false);
        taxInvoice.setInvoiceDate(LocalDate.now());
        taxInvoice.setDueDate(proforma.getDueDate());
        taxInvoice.setPaymentTerms(proforma.getPaymentTerms());
        taxInvoice.setTermsAndConditions(proforma.getTermsAndConditions());
        taxInvoice.setCreatedBy(admin);
        
        // Copy Client
        taxInvoice.setCustomer(proforma.getCustomer());
        taxInvoice.setClientName(proforma.getClientName());
        taxInvoice.setClientCompany(proforma.getClientCompany());
        taxInvoice.setClientEmail(proforma.getClientEmail());
        taxInvoice.setClientPhone(proforma.getClientPhone());
        taxInvoice.setClientAddress(proforma.getClientAddress());
        taxInvoice.setClientGstin(proforma.getClientGstin());
        taxInvoice.setPlaceOfSupply(proforma.getPlaceOfSupply());
        
        // Copy Supplier
        taxInvoice.setSupplierCompany(proforma.getSupplierCompany());
        taxInvoice.setSupplierAddress(proforma.getSupplierAddress());
        taxInvoice.setSupplierGstin(proforma.getSupplierGstin());
        taxInvoice.setSupplierState(proforma.getSupplierState());
        
        // Copy Refs
        taxInvoice.setQuotation(proforma.getQuotation());
        taxInvoice.setPurchaseOrder(proforma.getPurchaseOrder());
        taxInvoice.setCurrency(proforma.getCurrency());
        
        // Copy Totals
        taxInvoice.setSubtotal(proforma.getSubtotal());
        taxInvoice.setDiscountAmount(proforma.getDiscountAmount());
        taxInvoice.setTaxableAmount(proforma.getTaxableAmount());
        taxInvoice.setCgstAmount(proforma.getCgstAmount());
        taxInvoice.setSgstAmount(proforma.getSgstAmount());
        taxInvoice.setIgstAmount(proforma.getIgstAmount());
        taxInvoice.setTaxAmount(proforma.getTaxAmount());
        taxInvoice.setGrandTotal(proforma.getGrandTotal());
        taxInvoice.setBalanceDue(proforma.getGrandTotal());
        taxInvoice.setAmountInWords(proforma.getAmountInWords());
        
        // Copy Items
        if (proforma.getItems() != null) {
            for (InvoiceItem pItem : proforma.getItems()) {
                InvoiceItem tItem = new InvoiceItem();
                tItem.setInvoice(taxInvoice);
                tItem.setProductService(pItem.getProductService());
                tItem.setSku(pItem.getSku());
                tItem.setDescription(pItem.getDescription());
                tItem.setHsnSac(pItem.getHsnSac());
                tItem.setQuantity(pItem.getQuantity());
                tItem.setUnit(pItem.getUnit());
                tItem.setListPrice(pItem.getListPrice());
                tItem.setUnitPrice(pItem.getUnitPrice());
                tItem.setDiscountPercent(pItem.getDiscountPercent());
                tItem.setTaxPercent(pItem.getTaxPercent());
                tItem.setTaxableAmount(pItem.getTaxableAmount());
                tItem.setCgstAmount(pItem.getCgstAmount());
                tItem.setSgstAmount(pItem.getSgstAmount());
                tItem.setIgstAmount(pItem.getIgstAmount());
                tItem.setTaxAmount(pItem.getTaxAmount());
                tItem.setLineTotal(pItem.getLineTotal());
                tItem.setSortOrder(pItem.getSortOrder());
                taxInvoice.getItems().add(tItem);
            }
        }
        
        if (taxInvoice.getPurchaseOrder() != null) {
            validatePartialInvoicing(taxInvoice);
        }
        
        Invoice saved = invoiceRepository.save(taxInvoice);
        logActivity(admin.getId(), "Converted Proforma " + proforma.getInvoiceNumber() + " to Tax Invoice Draft", "Invoice", saved.getId());
        return saved;
    }

    @Transactional
    public Invoice createInvoiceFromQuotation(Long quotationId, InvoiceType type, AdminUser admin) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new IllegalArgumentException("Quotation not found"));
                
        if (!"ACCEPTED".equals(quotation.getStatus()) && !"CONVERTED".equals(quotation.getStatus())) {
            throw new IllegalStateException("Invoice can only be created from ACCEPTED or CONVERTED quotation");
        }
        
        InvoiceRequest request = new InvoiceRequest();
        request.setInvoiceType(type);
        request.setInvoiceDate(LocalDate.now());
        request.setQuotationId(quotationId);
        if (quotation.getCustomer() != null) {
            request.setCustomerId(quotation.getCustomer().getId());
        }
        request.setTermsAndConditions(quotation.getTermsAndConditions());
        
        List<InvoiceItemRequest> itemRequests = new ArrayList<>();
        if (quotation.getItems() != null) {
            int i = 0;
            for (QuotationItem qItem : quotation.getItems()) {
                InvoiceItemRequest iReq = new InvoiceItemRequest();
                iReq.setProductServiceId(qItem.getProductService() != null ? qItem.getProductService().getId() : null);
                iReq.setSku(qItem.getSku());
                iReq.setDescription(qItem.getDescription());
                iReq.setHsnSac(qItem.getHsnSac());
                iReq.setQuantity(qItem.getQuantity());
                iReq.setUnit(qItem.getUnit());
                iReq.setListPrice(qItem.getListPrice());
                iReq.setUnitPrice(qItem.getUnitPrice());
                iReq.setDiscountPercent(qItem.getDiscountPercent());
                iReq.setTaxPercent(qItem.getTaxPercent());
                iReq.setSortOrder(qItem.getSortOrder() != null ? qItem.getSortOrder() : i++);
                itemRequests.add(iReq);
            }
        }
        request.setItems(itemRequests);
        
        return createDraftInvoice(request, admin);
    }
    
    @Transactional
    public Invoice createInvoiceFromPurchaseOrder(Long poId, InvoiceType type, AdminUser admin) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found"));
                
        if (po.getStatus() != PurchaseOrderStatus.VERIFIED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
            throw new IllegalStateException("Invoice can only be created from VERIFIED or PARTIALLY_FULFILLED Purchase Order");
        }
        
        Quotation quotation = po.getQuotation();
        
        InvoiceRequest request = new InvoiceRequest();
        request.setInvoiceType(type);
        request.setInvoiceDate(LocalDate.now());
        request.setPurchaseOrderId(poId);
        if (quotation != null) {
            request.setQuotationId(quotation.getId());
            if (quotation.getCustomer() != null) {
                request.setCustomerId(quotation.getCustomer().getId());
            }
            request.setTermsAndConditions(quotation.getTermsAndConditions());
        }
        
        List<InvoiceItemRequest> itemRequests = new ArrayList<>();
        if (quotation != null && quotation.getItems() != null) {
            int i = 0;
            for (QuotationItem qItem : quotation.getItems()) {
                InvoiceItemRequest iReq = new InvoiceItemRequest();
                iReq.setProductServiceId(qItem.getProductService() != null ? qItem.getProductService().getId() : null);
                iReq.setSku(qItem.getSku());
                iReq.setDescription(qItem.getDescription());
                iReq.setHsnSac(qItem.getHsnSac());
                iReq.setQuantity(qItem.getQuantity());
                iReq.setUnit(qItem.getUnit());
                iReq.setListPrice(qItem.getListPrice());
                iReq.setUnitPrice(qItem.getUnitPrice());
                iReq.setDiscountPercent(qItem.getDiscountPercent());
                iReq.setTaxPercent(qItem.getTaxPercent());
                iReq.setSortOrder(qItem.getSortOrder() != null ? qItem.getSortOrder() : i++);
                itemRequests.add(iReq);
            }
        }
        request.setItems(itemRequests);
        
        return createDraftInvoice(request, admin);
    }

    private void validatePartialInvoicing(Invoice currentInvoice) {
        PurchaseOrder po = currentInvoice.getPurchaseOrder();
        if (po == null) return;
        
        BigDecimal currentTotal = currentInvoice.getGrandTotal() != null ? currentInvoice.getGrandTotal() : BigDecimal.ZERO;
        
        BigDecimal previousInvoiced;
        if (currentInvoice.getId() != null) {
            previousInvoiced = invoiceRepository.sumInvoicedAmountForPoExcluding(po.getId(), currentInvoice.getId());
        } else {
            previousInvoiced = invoiceRepository.sumInvoicedAmountForPo(po.getId());
        }
        
        BigDecimal totalAfterCurrent = previousInvoiced.add(currentTotal);
        
        if (totalAfterCurrent.compareTo(po.getPoValue()) > 0) {
            throw new IllegalStateException("Over-invoicing is not allowed. PO Value: " + po.getPoValue() + 
                                            ", Previously Invoiced: " + previousInvoiced + 
                                            ", Current Invoice: " + currentTotal);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        return pdfService.generateInvoicePdf(invoice);
    }

    private void logActivity(Long adminId, String action, String entityType, Long entityId) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .build();
        activityRepository.save(activity);
    }

    public InvoiceResponse mapToResponse(Invoice invoice) {
        if (invoice == null) return null;
        InvoiceResponse response = new InvoiceResponse();
        response.setId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setCurrency(invoice.getCurrency());
        response.setInvoiceType(invoice.getInvoiceType());
        response.setStatus(invoice.getStatus());
        response.setLocked(invoice.isLocked());

        response.setCustomerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null);
        response.setQuotationId(invoice.getQuotation() != null ? invoice.getQuotation().getId() : null);
        response.setPurchaseOrderId(invoice.getPurchaseOrder() != null ? invoice.getPurchaseOrder().getId() : null);

        response.setClientName(invoice.getClientName());
        response.setClientCompany(invoice.getClientCompany());
        response.setClientEmail(invoice.getClientEmail());
        response.setClientPhone(invoice.getClientPhone());
        response.setClientAddress(invoice.getClientAddress());
        response.setClientGstin(invoice.getClientGstin());
        response.setPlaceOfSupply(invoice.getPlaceOfSupply());

        response.setSupplierCompany(invoice.getSupplierCompany());
        response.setSupplierAddress(invoice.getSupplierAddress());
        response.setSupplierGstin(invoice.getSupplierGstin());
        response.setSupplierState(invoice.getSupplierState());

        response.setInvoiceDate(invoice.getInvoiceDate());
        response.setDueDate(invoice.getDueDate());
        response.setIssuedAt(invoice.getIssuedAt());
        response.setCancelledAt(invoice.getCancelledAt());
        response.setPaymentTerms(invoice.getPaymentTerms());
        response.setTermsAndConditions(invoice.getTermsAndConditions());

        response.setSubtotal(invoice.getSubtotal() != null ? invoice.getSubtotal() : BigDecimal.ZERO);
        response.setDiscountAmount(invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO);
        response.setTaxableAmount(invoice.getTaxableAmount() != null ? invoice.getTaxableAmount() : BigDecimal.ZERO);
        response.setCgstAmount(invoice.getCgstAmount() != null ? invoice.getCgstAmount() : BigDecimal.ZERO);
        response.setSgstAmount(invoice.getSgstAmount() != null ? invoice.getSgstAmount() : BigDecimal.ZERO);
        response.setIgstAmount(invoice.getIgstAmount() != null ? invoice.getIgstAmount() : BigDecimal.ZERO);
        response.setTaxAmount(invoice.getTaxAmount() != null ? invoice.getTaxAmount() : BigDecimal.ZERO);
        
        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        response.setGrandTotal(grandTotal);
        response.setAmountPaid(invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO);
        response.setBalanceDue(invoice.getBalanceDue() != null ? invoice.getBalanceDue() : grandTotal);
        response.setAmountInWords(invoice.getAmountInWords());

        response.setCreatedAt(invoice.getCreatedAt());
        response.setUpdatedAt(invoice.getUpdatedAt());

        if (invoice.getCreatedBy() != null) {
            response.setCreatedByUsername(invoice.getCreatedBy().getUsername());
            response.setCreatedByFullName(invoice.getCreatedBy().getName());
        }

        if (invoice.getItems() != null) {
            List<InvoiceItemResponse> items = invoice.getItems().stream().map(item -> {
                InvoiceItemResponse ir = new InvoiceItemResponse();
                ir.setId(item.getId());
                ir.setProductServiceId(item.getProductService() != null ? item.getProductService().getId() : null);
                ir.setSku(item.getSku());
                ir.setDescription(item.getDescription());
                ir.setHsnSac(item.getHsnSac());
                ir.setQuantity(item.getQuantity());
                ir.setUnit(item.getUnit());
                ir.setListPrice(item.getListPrice());
                ir.setUnitPrice(item.getUnitPrice());
                ir.setDiscountPercent(item.getDiscountPercent());
                ir.setTaxPercent(item.getTaxPercent());
                ir.setTaxableAmount(item.getTaxableAmount());
                ir.setCgstAmount(item.getCgstAmount());
                ir.setSgstAmount(item.getSgstAmount());
                ir.setIgstAmount(item.getIgstAmount());
                ir.setTaxAmount(item.getTaxAmount());
                ir.setLineTotal(item.getLineTotal());
                ir.setSortOrder(item.getSortOrder());
                return ir;
            }).collect(Collectors.toList());
            response.setItems(items);
        }

        return response;
    }
}
