import React from 'react';

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-headline italic text-4xl mb-10">Termos de Serviço</h1>

      <div className="space-y-8 text-on-surface leading-relaxed">
        <section>
          <h2 className="text-2xl font-headline italic mb-4">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar nossos serviços de aluguel de roupas de luxo, você concorda em cumprir os Termos de Serviço aqui estabelecidos. Esses termos aplicam-se a todos os clientes em nossa plataforma online. Se você não concorda com qualquer parte desses termos, por favor, não utilize nossos serviços.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">2. Serviços Oferecidos</h2>
          <p>
            Nós oferecemos o serviço de aluguel de roupas de luxo para ocasiões especiais, incluindo vestidos, acessórios e outros itens. Cada item disponível para aluguel está sujeito a disponibilidade e pode variar de acordo com a demanda.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">3. Processo de Aluguel</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Seleção:</strong> Os clientes podem selecionar as peças desejadas diretamente na loja ou através de nossa plataforma online. Para reservar um item, é necessário completar o processo de pagamento e concordar com os termos de devolução.</li>
            <li><strong>Período de Aluguel:</strong> O período de aluguel é determinado no momento da reserva e pode variar de acordo com a peça escolhida. A data de devolução será informada no ato da locação e deve ser rigorosamente cumprida.</li>
            <li><strong>Taxas e Pagamento:</strong> O valor total do aluguel, incluindo possíveis taxas de serviço ou seguros, deve ser pago no momento da reserva. Aceitamos diversas formas de pagamento, que serão listadas no checkout.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">4. Uso Adequado das Peças</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Responsabilidade:</strong> O cliente é responsável por qualquer dano, mancha ou perda da peça durante o período de aluguel. Recomendamos extremo cuidado ao usar nossas peças, evitando exposições a situações que possam comprometer sua integridade.</li>
            <li><strong>Proibições:</strong> Não é permitido realizar alterações ou ajustes nas peças alugadas. Qualquer modificação será considerada dano e poderá resultar em cobrança adicional.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">5. Devolução das Peças</h2>
          <p>
            As peças devem ser devolvidas nas mesmas condições em que foram entregues, dentro do prazo estipulado. O não cumprimento do prazo resultará em cobrança de taxas adicionais. Em caso de danos, o cliente será responsável pelos custos de reparo ou substituição.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">6. Cancelamento e Reembolso</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Cancelamentos:</strong> Cancelamentos realizados com pelo menos 7 dias de antecedência da data de aluguel são elegíveis para reembolso integral. Cancelamentos realizados entre 3 e 7 dias antes da data de aluguel receberão um reembolso parcial de 50%. Cancelamentos com menos de 3 dias de antecedência não serão reembolsados.</li>
            <li><strong>Alterações:</strong> Alterações na reserva, como a troca de peças ou mudança de datas, podem ser realizadas conforme a disponibilidade e estão sujeitas a taxas adicionais.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">7. Política de Privacidade</h2>
          <p>
            Nós nos comprometemos a proteger a privacidade dos nossos clientes. Todos os dados pessoais coletados durante o processo de aluguel serão utilizados exclusivamente para a prestação de serviços e não serão compartilhados com terceiros sem o consentimento do cliente, exceto quando exigido por lei.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">8. Limitação de Responsabilidade</h2>
          <p>
            Não nos responsabilizamos por qualquer dano indireto, incidental, ou consequencial resultante do uso de nossos serviços ou produtos. Nossa responsabilidade total em qualquer circunstância está limitada ao valor pago pelo aluguel.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">9. Alterações nos Termos de Serviço</h2>
          <p>
            Reservamo-nos o direito de atualizar ou modificar esses Termos de Serviço a qualquer momento, sem aviso prévio. Recomendamos que você revise esses termos periodicamente para se manter informado sobre possíveis mudanças.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-headline italic mb-4">10. Contato</h2>
          <p>
            Em caso de dúvidas, reclamações ou necessidade de suporte, entre em contato conosco através do e-mail <a href="mailto:clothing2mkt@gmail.com" className="text-primary hover:underline">clothing2mkt@gmail.com</a>. Estamos à disposição para ajudar.
          </p>
        </section>
      </div>
    </div>
  );
}
