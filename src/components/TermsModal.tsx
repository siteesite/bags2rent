import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShieldCheck, AlertCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: {
    name?: string;
    cpf?: string;
    phone?: string;
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

export function TermsModal({ isOpen, onClose, userData }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-3xl h-[85vh] bg-surface z-[101] shadow-2xl flex flex-col rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/10 bg-surface z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-headline italic text-2xl tracking-wide leading-none">Contrato de Locação</h3>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mt-1">Bags2rent & Você</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-on-surface/5 rounded-full transition-colors"
                aria-label="Fecar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-surface text-on-surface custom-scrollbar">
              
              {/* Introduction */}
              <div className="space-y-4">
                <div className="p-6 bg-surface-container-lowest border border-outline-variant/20 rounded shadow-sm">
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    <strong className="text-on-surface">Bags2rent LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 57.130.673/0001-83, com sede na Rua Empresário Clóvis Rolim, nº 02051, sala 903, Bloco A, Bairro dos Ipês, João Pessoa – PB, e endereço operacional para envios e devoluções em São Paulo – SP (“Bags2rent”, “nós”, “nosso”);
                  </p>
                  <div className="py-4 flex justify-center">
                    <span className="text-primary font-headline italic text-xl">E</span>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    <strong className="text-on-surface">VOCÊ</strong>, 
                    <span className="text-on-surface mx-1 font-bold">{userData?.name || '___________________________'}</span>, 
                    inscrita no CPF sob o nº 
                    <span className="text-on-surface mx-1 font-bold">{userData?.cpf || '_______________'}</span>, 
                    com telefone 
                    <span className="text-on-surface mx-1 font-bold">{userData?.phone || '_______________'}</span>, 
                    residente e domiciliado(a) na 
                    <span className="text-on-surface mx-1 font-bold">{userData?.street || '_______________'}</span>, nº 
                    <span className="text-on-surface mx-1 font-bold">{userData?.number || '_____'}</span>, 
                    {userData?.neighborhood ? (
                      <>
                        <span className="text-on-surface mx-1 font-bold">{userData.neighborhood}</span>, 
                      </>
                    ) : ''}
                    Cidade 
                    <span className="text-on-surface mx-1 font-bold">{userData?.city || '_______________'}</span> – 
                    <span className="text-on-surface mx-1 font-bold">{userData?.state || '__'}</span>, 
                    CEP <span className="text-on-surface mx-1 font-bold">{userData?.cep || '________'}</span>, 
                    devidamente cadastrada no sistema da Bags2rent, cujos dados foram informados no ato da contratação (“você”, “seu”, “sua”, “cliente”).
                  </p>
                </div>
                <p className="text-xs text-on-surface-variant italic leading-relaxed">
                  As partes resolvem celebrar o presente Contrato de Locação de Vestuário (“Contrato”), que regerá toda e qualquer locação de artigos de vestuário disponibilizados no website https://bags2rent.com.br/ (“Site”), mediante as cláusulas e condições a seguir.
                </p>
              </div>

              {/* Acceptance Box */}
              <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r flex gap-4">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                <p className="text-[11px] text-primary/90 leading-relaxed">
                  Como condição de adesão a este Contrato e às políticas do Site, você declara ser maior de 18 (dezoito) anos, ter realizado a leitura completa e atenta deste instrumento e das políticas aplicáveis, conferindo, assim, sua livre, informada e inequívoca concordância com todas as cláusulas aqui estipuladas. Caso não concorde, deverá se abster de realizar a locação.
                </p>
              </div>

              {/* Clause Sections */}
              
              {/* Cláusula 1 */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary flex items-center gap-2">
                   Cláusula 1ª – Objeto
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>1.1. O presente Contrato tem como objeto a locação, por prazo certo e determinado, de artigos de vestuário de propriedade única e exclusiva da Bags2rent, disponibilizados no Site e selecionados por você (“Produto”), de acordo com a disponibilidade do acervo no momento da contratação.</p>
                  <p>1.2. A locação do Produto será realizada mediante aceite eletrônico deste Contrato, bem como das políticas vigentes no Site, incluindo, mas não se limitando à Política de Troca e Devolução, Política de Entrega, Política de Pagamento, Política de Cancelamento e Política de Privacidade da Bags2rent.</p>
                  <p>1.3. Ao confirmar a locação e declarar que leu e aceitou os termos deste Contrato, você concorda expressamente com todas as condições aqui previstas, que passam a reger a relação contratual entre as partes.</p>
                </div>
                <div className="bg-surface-container-low p-4 border border-outline-variant/10 rounded-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> Quadro-Resumo – Cláusula 1ª
                  </p>
                  <ul className="text-[10px] space-y-1 text-on-surface-variant list-disc pl-4">
                    <li>O contrato trata da locação de vestuário</li>
                    <li>As peças são de propriedade exclusiva da Bags2rent</li>
                    <li>A contratação ocorre mediante aceite eletrônico</li>
                    <li>Aplicam-se também as políticas do Site</li>
                  </ul>
                </div>
              </section>

              {/* Cláusula 2 */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Cláusula 2ª – Valor e Forma de Pagamento
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>2.1. O valor da locação será previamente informado a você no ato da contratação, de acordo com the Produto selecionado, o prazo da locação, o local de entrega e a forma de devolução escolhida.</p>
                  <p>2.2. É de sua responsabilidade única e exclusiva a escolha do Produto, do prazo de locação, do local de entrega e da forma de devolução, sendo que os custos de frete de envio e/ou devolução, quando aplicáveis, serão acrescidos ao valor da locação.</p>
                  <p>2.3. Para aprovação da locação, a Bags2rent poderá encaminhar confirmação por meio de canal oficial de atendimento, no qual constarão os prazos de início, término e duração da locação.</p>
                  <p>2.4. A liberação do Produto estará sempre condicionada à confirmação do pagamento integral do valor da locação, não sendo devido qualquer envio antes da respectiva confirmação.</p>
                  <p>2.5. A primeira locação ou locações realizadas após longo período de inatividade poderão estar condicionadas à validação cadastral, incluindo, se necessário, a confirmação de dados pessoais, endereço de entrega e titularidade do meio de pagamento.</p>
                </div>
                <div className="bg-surface-container-low p-4 border border-outline-variant/10 rounded-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> Quadro-Resumo – Cláusula 2ª
                  </p>
                  <ul className="text-[10px] space-y-1 text-on-surface-variant list-disc pl-4">
                    <li>O valor depende do Produto e do prazo</li>
                    <li>Fretes podem ser cobrados à parte</li>
                    <li>A locação só é efetivada após pagamento confirmado</li>
                    <li>A escolha do Produto é responsabilidade do cliente</li>
                  </ul>
                </div>
              </section>

              {/* Cláusula 3 */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Cláusula 3ª – Prazo da Locação
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>3.1. O prazo da locação será aquele escolhido por você no momento da contratação, conforme as opções disponibilizadas no Site e a disponibilidade do Produto.</p>
                  <p>3.2. Durante a vigência da locação, você poderá solicitar, por meio de canal oficial de atendimento da Bags2rent, a extensão do prazo de locação, a qual estará sujeita à disponibilidade do Produto e ao pagamento do valor adicional correspondente.</p>
                  <p>3.3. A eventual prorrogação do prazo somente será considerada válida após confirmação expressa da Bags2rent e quitação do valor adicional devido.</p>
                </div>
                <div className="bg-surface-container-low p-4 border border-outline-variant/10 rounded-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> Quadro-Resumo – Cláusula 3ª
                  </p>
                  <ul className="text-[10px] space-y-1 text-on-surface-variant list-disc pl-4">
                    <li>O prazo é escolhido no ato da contratação</li>
                    <li>A extensão depende de disponibilidade e pagamento adicional</li>
                    <li>Não há prorrogação automática</li>
                  </ul>
                </div>
              </section>

              {/* Cláusula 4 */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Cláusula 4ª – Entrega dos Produtos
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>4.1. O Produto será entregue pela Bags2rent a você limpo, higienizado, em perfeito estado de conservação e pronto para uso, na forma e na data solicitadas, em horário comercial, sendo certo que eventual entrega antecipada não ensejará qualquer cobrança adicional.</p>
                  <p>4.1.1. O transporte do Produto será realizado pela Bags2rent ou por terceiros por ela contratados, cabendo a você informar corretamente o endereço de entrega, em local de fácil identificação e acesso (portaria, recepção ou equivalente).</p>
                  <p>4.1.3. Presume-se autorizada por você qualquer terceira pessoa que receba o Produto no endereço informado, incluindo, mas não se limitando a porteiros, síndicos, recepcionistas ou pessoa encontrada no local indicado.</p>
                  <p>4.2. Caso a entrega não possa ser realizada por erro ou omissão nas informações fornecidas por você, ou pela ausência de pessoa responsável para o recebimento, poderá ser cobrado novo valor de frete para a realização de nova tentativa de entrega.</p>
                  <p>4.3. Na eventual impossibilidade de a Bags2rent realizar a entrega do Produto por motivo a ela exclusivamente imputável, o valor da locação será integralmente restituído, sem prejuízo do encerramento do contrato quanto ao Produto afetado.</p>
                </div>
                <div className="bg-surface-container-low p-4 border border-outline-variant/10 rounded-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> Quadro-Resumo – Cláusula 4ª
                  </p>
                  <ul className="text-[10px] space-y-1 text-on-surface-variant list-disc pl-4">
                    <li>O Produto é entregue limpo e pronto para uso</li>
                    <li>Você deve informar corretamente o endereço</li>
                    <li>É necessário haver alguém para receber o Produto</li>
                    <li>Falha da Bags2rent gera reembolso integral</li>
                  </ul>
                </div>
              </section>

              {/* Cláusula 5 */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Cláusula 5ª – Obrigações e Responsabilidades
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>5.1. A partir do recebimento do Produto, você assume total responsabilidade pela guarda, uso e conservação, comprometendo-se a utilizá-lo com zelo e cuidado, respondendo por roubo, perda, extravio, manchas, rasgos, avarias ou quaisquer danos, independentemente de culpa.</p>
                  <p>5.1.1. <strong className="text-primary font-bold">É expressamente proibida qualquer tentativa de lavagem, higienização doméstica, aplicação de produtos químicos, alvejantes, perfumes, vaporização inadequada ou qualquer procedimento que possa danificar o Produto, sendo tais condutas consideradas mau uso.</strong> A higienização das peças é única e exclusivamente de responsabilidade da Clothing 2 Rent.</p>
                  <p>5.1.2. Também é vedada a realização de ajustes permanentes, tais como cortes, costuras fixas, tingimentos ou alterações definitivas. São permitidas apenas bainhas falsas temporárias, desde que não causem danos ao tecido.</p>
                  <p>5.1.3. Danos decorrentes de mau uso ou intervenções indevidas serão integralmente cobrados (valor do reparo ou valor de varejo se irreparável).</p>
                  <p>5.2. No momento do recebimento, você deverá provar e conferir o Produto, comprometendo-se a comunicar a Bags2rent, por meio de canal oficial de atendimento, em até 12 (doze) horas, qualquer divergência, defeito ou insatisfação.</p>
                </div>
                <div className="bg-surface-container-low p-4 border border-outline-variant/10 rounded-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> Quadro-Resumo – Cláusula 5ª
                  </p>
                  <ul className="text-[10px] space-y-1 text-on-surface-variant list-disc pl-4">
                    <li>Você é responsável pelo Produto durante toda a locação</li>
                    <li>Não é permitido lavar, ajustar permanentemente ou alterar</li>
                    <li>Danos podem gerar cobrança de reparo ou valor integral</li>
                    <li>Reclamações devem ocorrer em até 12 horas</li>
                  </ul>
                </div>
              </section>

              {/* Cláusula 6 & 7 (Simplified for UI brevity but keeping core) */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Cláusula 6ª & 7ª – Devolução e Atrasos
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>6.1. Devolução impreterível na data de término da locação, utilizando a embalagem original.</p>
                  <p>7.2. O atraso na devolução sujeita você ao pagamento de multa correspondente a 40% do valor total da locação por dia de atraso.</p>
                  <p>7.3. Atrasos superiores a 10 dias implicam na cobrança do valor integral de varejo do Produto.</p>
                </div>
                <div className="bg-surface-container-low p-4 border border-outline-variant/10 rounded-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary">
                    Resumo Devolução
                  </p>
                  <ul className="text-[10px] space-y-1 text-on-surface-variant list-disc pl-4">
                    <li>Devolução na data correta e embalagem original</li>
                    <li>Multa diária de 40% em caso de atraso</li>
                    <li>Cobrança de valor integral após 10 dias de atraso</li>
                  </ul>
                </div>
              </section>

              {/* Cláusula 8 – Cancelamento */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Cláusula 8ª – Cancelamento
                </h4>
                <div className="overflow-x-auto border border-outline-variant/20 rounded">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-primary/5">
                      <tr>
                        <th className="p-3 font-bold border-b border-outline-variant/10">Data do cancelamento</th>
                        <th className="p-3 font-bold border-b border-outline-variant/10">Estorno</th>
                        <th className="p-3 font-bold border-b border-outline-variant/10">Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      <tr>
                        <td className="p-3 text-on-surface-variant">+30 dias antecedência</td>
                        <td className="p-3 text-on-surface">100%</td>
                        <td className="p-3 text-on-surface">100%</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-on-surface-variant">Inferior a 30 dias</td>
                        <td className="p-3 text-on-surface">90%</td>
                        <td className="p-3 text-on-surface">100%</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-on-surface-variant">Menos de 10 dias</td>
                        <td className="p-3 text-on-surface">80%</td>
                        <td className="p-3 text-on-surface">100%</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-on-surface-variant">Após o envio</td>
                        <td className="p-3 text-on-surface italic">N/A</td>
                        <td className="p-3 text-on-surface">50%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Final Clauses Summary */}
              <section className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-primary">
                  Disposições Gerais
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
                  <p>12.7. Cobranças sujeitas a protesto e inclusão em órgãos de proteção ao crédito.</p>
                  <p>12.10. Foro eleito: João Pessoa – PB.</p>
                </div>
              </section>

            </div>

            {/* Sticky Footer */}
            <div className="p-6 border-t border-outline-variant/10 bg-surface shrink-0">
              <button 
                onClick={onClose}
                className="w-full bg-primary text-on-primary py-4 font-bold uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all rounded shadow-lg shadow-primary/20"
              >
                Compreendi e Concordo
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
