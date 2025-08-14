import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrintableReceiptProps {
  order: any;
  restaurant: any;
}

export function PrintableReceipt({ order, restaurant }: PrintableReceiptProps) {
  const orderType = order.delivery_fee > 0 ? "ENTREGA" : "RETIRADA";

  return (
    <div className="hidden print:block">
      <style>
        {`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: black;
              background: white;
            }
            
            .receipt-container {
              width: 80mm;
              padding: 5mm;
              background: white;
            }
            
            .text-center { text-align: center; }
            .text-bold { font-weight: bold; }
            .text-small { font-size: 10px; }
            .separator { 
              border-top: 1px dashed black; 
              margin: 3mm 0; 
            }
            .flex-between {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .mb-1 { margin-bottom: 1mm; }
            .mb-2 { margin-bottom: 2mm; }
            .mt-2 { margin-top: 2mm; }
          }
        `}
      </style>
      
      <div className="receipt-container">
        {/* Cabeçalho */}
        <div className="text-center mb-2">
          <div className="text-bold" style={{ fontSize: "14px" }}>
            {restaurant.name}
          </div>
          {restaurant.whatsapp && (
            <div className="text-small">
              WhatsApp: {restaurant.whatsapp}
            </div>
          )}
        </div>

        <div className="separator"></div>

        {/* Informações do Pedido */}
        <div className="mb-2">
          <div className="text-center text-bold">
            CUPOM NÃO FISCAL
          </div>
          <div className="text-center text-small">
            Pedido #{order.id.slice(-8)}
          </div>
          <div className="text-center text-small">
            {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
        </div>

        <div className="separator"></div>

        {/* Tipo de Pedido */}
        <div className="text-center text-bold mb-2">
          {orderType}
        </div>

        {/* Cliente */}
        {order.customer_name && (
          <div className="mb-2">
            <div><strong>Cliente:</strong> {order.customer_name}</div>
            {order.customer_phone && (
              <div><strong>Telefone:</strong> {order.customer_phone}</div>
            )}
            {orderType === "ENTREGA" && order.address && (
              <div className="text-small">
                <strong>Endereço:</strong> {order.address}
              </div>
            )}
          </div>
        )}

        <div className="separator"></div>

        {/* Itens do Pedido */}
        <div className="mb-2">
          <div className="text-bold mb-1">ITENS:</div>
          {order.items?.map((item: any, index: number) => {
            const productName = item.productName || 
                              item.product_name || 
                              item.name || 
                              item.product?.name || 
                              `Produto #${index + 1}`;
            
            const unitPrice = Number(item.unitPrice || item.price || 0);
            const quantity = item.quantity || 1;
            const itemTotal = unitPrice * quantity;

            return (
              <div key={index} className="mb-1">
                <div className="flex-between">
                  <div style={{ flex: 1 }}>
                    {quantity}x {productName}
                  </div>
                  <div>
                    R$ {itemTotal.toFixed(2)}
                  </div>
                </div>
                
                {/* Adicionais */}
                {item.addons && item.addons.length > 0 && (
                  <div className="text-small" style={{ marginLeft: "5mm" }}>
                    {item.addons.map((addon: any, addonIndex: number) => {
                      const addonName = addon.option?.name || addon.name || `Adicional ${addonIndex + 1}`;
                      const addonPrice = Number(addon.option?.price || addon.price || 0);
                      
                      return (
                        <div key={addonIndex} className="flex-between">
                          <div>+ {addonName}</div>
                          <div>R$ {(addonPrice * quantity).toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Observações */}
                {item.observations && (
                  <div className="text-small" style={{ marginLeft: "5mm" }}>
                    Obs: {item.observations}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="separator"></div>

        {/* Totais */}
        <div className="mb-2">
          <div className="flex-between">
            <div>Subtotal:</div>
            <div>R$ {Number(order.subtotal || 0).toFixed(2)}</div>
          </div>
          
          {Number(order.delivery_fee || 0) > 0 && (
            <div className="flex-between">
              <div>Taxa de entrega:</div>
              <div>R$ {Number(order.delivery_fee).toFixed(2)}</div>
            </div>
          )}
          
          <div className="separator"></div>
          
          <div className="flex-between text-bold">
            <div>TOTAL:</div>
            <div>R$ {Number(order.total || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Forma de Pagamento */}
        {order.payment_method && (
          <>
            <div className="separator"></div>
            <div className="mb-2">
              <div><strong>Pagamento:</strong> {order.payment_method}</div>
            </div>
          </>
        )}

        <div className="separator"></div>

        {/* Rodapé */}
        <div className="text-center text-small">
          <div>Obrigado pela preferência!</div>
          <div className="mt-2">
            {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
        </div>
      </div>
    </div>
  );
}