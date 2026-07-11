import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Printer } from 'lucide-react';

export function ContractPDF() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return;
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
      if (error) {
        console.error(error);
      } else {
        setOrder(data);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500">Pedido não encontrado.</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  const name = order.billing_address?.name || order.shipping_address?.name || '_______________';
  const cpf = order.customer_cpf || order.cpf || '_______________';
  const phone = order.customer_phone || order.billing_address?.phone || '_______________';
  const street = order.billing_address?.street || '_______________';
  const number = order.billing_address?.number || '___';
  const neighborhood = order.billing_address?.neighborhood || '';
  const city = order.billing_address?.city || '_______________';
  const state = order.billing_address?.province || order.billing_address?.state || '__';
  const cep = order.billing_address?.zip || '________';
  const items = order.line_items || [];

  return (
    <div className="bg-white min-h-screen text-black">
      {/* Nao imprimir barra superior */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: white;
            }
            @page {
              margin: 2cm;
            }
          }
        `}
      </style>
      
      <div className="no-print bg-gray-100 p-4 flex justify-between items-center border-b border-gray-300 fixed top-0 w-full z-50 shadow-sm">
        <span className="font-medium text-gray-700">Contrato do Pedido #{order.order_name}</span>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Printer className="w-4 h-4" /> Imprimir / Salvar em PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto pt-24 pb-12 px-8 print:pt-0 print:px-0">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Contrato de Locação de Vestuário</h1>
          <p className="text-sm text-gray-600">Pedido #{order.order_name} | Realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="space-y-6 text-sm text-justify leading-relaxed">
          <p>
            <strong>Bags2rent LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 57.130.673/0001-83, com sede na Rua Empresário Clóvis Rolim, nº 02051, sala 903, Bloco A, Bairro dos Ipês, João Pessoa – PB, e endereço operacional para envios e devoluções em São Paulo – SP (“Bags2rent”, “nós”, “nosso”);
          </p>
          <div className="text-center font-bold">E</div>
          <p>
            <strong>VOCÊ</strong>, <strong>{name}</strong>, inscrita no CPF sob o nº <strong>{cpf}</strong>, com telefone <strong>{phone}</strong>, residente e domiciliado(a) na <strong>{street}</strong>, nº <strong>{number}</strong>, {neighborhood ? <strong>{neighborhood}, </strong> : ''}Cidade <strong>{city}</strong> – <strong>{state}</strong>, CEP <strong>{cep}</strong>, devidamente cadastrada no sistema da Bags2rent, cujos dados foram informados no ato da contratação (“você”, “seu”, “sua”, “cliente”).
          </p>

          <p className="italic text-gray-600">
            As partes resolvem celebrar o presente Contrato de Locação de Vestuário (“Contrato”), que regerá toda e qualquer locação de artigos de vestuário disponibilizados no website https://bags2rent.com.br/ (“Site”), mediante as cláusulas e condições a seguir.
          </p>

          <div className="mt-8">
            <h3 className="font-bold uppercase mb-2">Itens da Locação</h3>
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">Item</th>
                  <th className="border border-gray-300 p-2">Período / Datas</th>
                  <th className="border border-gray-300 p-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">
                      {item.quantity}x {item.name}
                      {item.size && <span className="text-xs block">Tamanho: {item.size}</span>}
                      {item.sku && <span className="text-xs block">SKU: {item.sku}</span>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {item.dates || 'Não definido'} <br/>
                      <span className="text-xs text-gray-600">{item.period || ''}</span>
                    </td>
                    <td className="border border-gray-300 p-2">R$ {item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-right">
              <strong>Total do Pedido:</strong> R$ {order.total_price}
            </div>
          </div>

          <h3 className="font-bold uppercase mt-8 mb-2">Cláusula 1ª – Objeto</h3>
          <p>1.1. O presente Contrato tem como objeto a locação, por prazo certo e determinado, de artigos de vestuário de propriedade única e exclusiva da Bags2rent, disponibilizados no Site e selecionados por você (“Produto”), de acordo com a disponibilidade do acervo no momento da contratação.</p>
          <p>1.2. A locação do Produto será realizada mediante aceite eletrônico deste Contrato, bem como das políticas vigentes no Site, incluindo, mas não se limitando à Política de Troca e Devolução, Política de Entrega, Política de Pagamento, Política de Cancelamento e Política de Privacidade da Bags2rent.</p>
          <p>1.3. Ao confirmar a locação e declarar que leu e aceitou os termos deste Contrato, você concorda expressamente com todas as condições aqui previstas, que passam a reger a relação contratual entre as partes.</p>

          <h3 className="font-bold uppercase mt-6 mb-2">Cláusula 2ª – Valor e Forma de Pagamento</h3>
          <p>2.1. O valor da locação será previamente informado a você no ato da contratação, de acordo com o Produto selecionado, o prazo da locação, o local de entrega e a forma de devolução escolhida.</p>
          <p>2.2. É de sua responsabilidade única e exclusiva a escolha do Produto, do prazo de locação, do local de entrega e da forma de devolução, sendo que os custos de frete de envio e/ou devolução, quando aplicáveis, serão acrescidos ao valor da locação.</p>
          <p>2.4. A liberação do Produto estará sempre condicionada à confirmação do pagamento integral do valor da locação, não sendo devido qualquer envio antes da respectiva confirmação.</p>

          <h3 className="font-bold uppercase mt-6 mb-2">Cláusula 3ª – Prazo da Locação</h3>
          <p>3.1. O prazo da locação será aquele escolhido por você no momento da contratação, conforme as opções disponibilizadas no Site e a disponibilidade do Produto.</p>

          <h3 className="font-bold uppercase mt-6 mb-2">Cláusula 4ª – Entrega dos Produtos</h3>
          <p>4.1. O Produto será entregue pela Bags2rent a você limpo, higienizado, em perfeito estado de conservação e pronto para uso, na forma e na data solicitadas.</p>

          <h3 className="font-bold uppercase mt-6 mb-2">Cláusula 5ª – Obrigações e Responsabilidades</h3>
          <p>5.1. A partir do recebimento do Produto, você assume total responsabilidade pela guarda, uso e conservação, comprometendo-se a utilizá-lo com zelo e cuidado, respondendo por roubo, perda, extravio, manchas, rasgos, avarias ou quaisquer danos, independentemente de culpa.</p>
          <p>5.1.1. <strong>É expressamente proibida qualquer tentativa de lavagem, higienização doméstica, aplicação de produtos químicos, alvejantes, perfumes, vaporização inadequada ou qualquer procedimento que possa danificar o Produto.</strong> A higienização é exclusiva da Bags2rent.</p>
          <p>5.1.2. É vedada a realização de ajustes permanentes (cortes, costuras fixas). São permitidas apenas bainhas falsas temporárias.</p>
          <p>5.1.3. Danos decorrentes de mau uso serão integralmente cobrados (valor do reparo ou valor de varejo se irreparável).</p>
          <p>5.2. No recebimento, você deverá provar e conferir o Produto, comprometendo-se a comunicar em até 12 (doze) horas, qualquer divergência ou defeito.</p>

          <h3 className="font-bold uppercase mt-6 mb-2">Cláusula 6ª & 7ª – Devolução e Atrasos</h3>
          <p>6.1. Devolução impreterível na data de término da locação, utilizando a embalagem original.</p>
          <p>7.2. O atraso na devolução sujeita você ao pagamento de multa correspondente a 40% do valor total da locação por dia de atraso.</p>
          <p>7.3. Atrasos superiores a 10 dias implicam na cobrança do valor integral de varejo do Produto.</p>

          <h3 className="font-bold uppercase mt-6 mb-2">Assinatura Eletrônica</h3>
          <p>
            Este contrato foi aceito eletronicamente pelo Cliente (<strong>{name}</strong> - CPF: <strong>{cpf}</strong>) no momento do checkout e conclusão do pedido #{order.order_name}, registrado no sistema da Bags2rent em <strong>{new Date(order.created_at).toLocaleString('pt-BR')}</strong> com o endereço IP e validações de sessão do usuário. O aceite digital possui validade jurídica equiparada à assinatura física.
          </p>
        </div>
      </div>
    </div>
  );
}
