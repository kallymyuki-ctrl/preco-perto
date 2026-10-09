import { IconShield, IconCheck, IconArrowLeft } from './Icons';

interface PageProps { onBack: () => void; }

const Shell = ({ title, onBack, children }: PageProps & { title: string; children: React.ReactNode }) => (
  <div className="animate-fadeIn">
    <button onClick={onBack} className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">
      <IconArrowLeft size={16} /> Voltar
    </button>
    <div className="px-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold font-display">{title}</h1>
      <div className="space-y-4 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  </div>
);

const Item = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="flex items-center gap-2 mb-2 text-base font-bold text-slate-900">
      <IconCheck size={16} className="text-accent" /> {title}
    </h2>
    <p>{children}</p>
  </section>
);

export const TermsPage = ({ onBack }: PageProps) => (
  <Shell title="Termos de Uso" onBack={onBack}>
    <p className="text-xs text-slate-400">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

    <Item title="1. O que é o Preço Perto">
      O Preço Perto é uma plataforma de comparação de preços que reúne ofertas de supermercados,
      farmácias e pet shops parceiros para ajudar você a decidir onde comprar.
    </Item>

    <Item title="2. Sua conta">
      Você é responsável por manter suas credenciais em sigilo e pelas atividades realizadas na sua
      conta. O acesso é pessoal e intransferível.
    </Item>

    <Item title="3. Preços e disponibilidade">
      Os preços são informados pelos estabelecimentos parceiros e podem variar. O Preço Perto não
      garante que o valor exibido no app seja idêntico ao da gôndola — confira sempre antes de pagar.
    </Item>

    <Item title="4. Cashback e saques">
      O cashback é creditado conforme as regras vigentes de cada campanha e pode ser sacado a partir
      de R$ 10,00 via Pix, em até 2 dias úteis. Valores obtidos de forma fraudulenta são estornados.
    </Item>

    <Item title="5. Uso responsável">
      É proibido usar o app para fraudar campanhas, criar contas falsas, extrair dados em massa ou
      praticar qualquer ato ilícito.
    </Item>

    <Item title="6. Limitação de responsabilidade">
      O Preço Perto atua como intermediário de informação. Não somos responsáveis pela qualidade,
      entrega ou disponibilidade dos produtos vendidos pelos parceiros.
    </Item>

    <Item title="7. Alterações e cancelamento">
      Podemos alterar estes termos a qualquer momento, com aviso no app. Você pode encerrar sua conta
      quando quiser pelo próprio aplicativo.
    </Item>

    <Item title="8. Foro">
      Fica eleito o foro da comarca de Porto Alegre/RS para dirimir eventuais controvérsias.
    </Item>
  </Shell>
);

export const PrivacyPage = ({ onBack }: PageProps) => (
  <Shell title="Política de Privacidade" onBack={onBack}>
    <div className="flex items-start gap-3 p-4 mb-2 rounded-2xl bg-accent-light">
      <IconShield className="mt-0.5 text-accent" size={20} />
      <p className="text-xs leading-relaxed text-accent-dark">
        Em conformidade com a LGPD (Lei 13.709/2018). Nesta versão, os dados ficam armazenados no
        seu próprio dispositivo (localStorage) e não são enviados para nossos servidores.
      </p>
    </div>

    <Item title="Dados que coletamos">
      Nome, e-mail, telefone, cidade, lista de compras, favoritos e histórico de transações — apenas
      para fazer o app funcionar. A senha nunca é salva em texto puro.
    </Item>

    <Item title="Por que usamos">
      Para montar sua lista, calcular a melhor compra, creditar cashback e personalizar as ofertas da
      sua região. Nunca vendemos seus dados.
    </Item>

    <Item title="Com quem compartilhamos">
      Somente com processadores necessários ao serviço (ex.: Supabase para hospedagem de dados e
      Mercado Pago para processar pagamentos) e parceiros, de forma anonimizada.
    </Item>

    <Item title="Seus direitos">
      Você pode acessar, corrigir, exportar ou apagar seus dados a qualquer momento. Para apagar tudo,
      use “Sair da conta” no perfil e limpe os dados do site no navegador.
    </Item>

    <Item title="Retenção">
      Mantemos os dados enquanto sua conta existir. Após a exclusão, as informações são removidas em
      até 30 dias, ressalvadas obrigações legais.
    </Item>

    <Item title="Contato">
      Dúvidas sobre privacidade: privacidade@precoperto.app
    </Item>
  </Shell>
);

export const PartnerRulesPage = ({ onBack }: PageProps) => (
  <Shell title="Regras para Parceiros Profissionais" onBack={onBack}>
    <p>
      Estas regras valem para entregadores, divulgadores e representantes de loja que atuam em nome
      do Preço Perto.
    </p>

    <Item title="1. Conduta">
      Atue com ética, respeito e profissionalismo. É vedada qualquer promessa de preço ou condição
      que não esteja no app.
    </Item>

    <Item title="2. Divulgação">
      Use apenas os materiais oficiais. Não compre tráfego com o nome da marca nem faça promessas de
      ganhos garantidos.
    </Item>

    <Item title="3. Atendimento ao cliente">
      Seja cordial, cumpra os horários combinados e informe imediatamente qualquer problema na
      entrega ou no cadastro de preços.
    </Item>

    <Item title="4. Veracidade dos preços">
      Todo preço cadastrado precisa ser conferido na loja. Informar valores falsos gera advertência e,
      em caso de reincidência, desligamento.
    </Item>

    <Item title="5. Pagamentos">
      Comissões e bonificações são pagas semanalmente via Pix, conforme o plano de cada modalidade.
    </Item>

    <Item title="6. Desligamento">
      O descumprimento destas regras pode resultar em suspensão imediata e rescisão do contrato de
      parceria, sem ônus para as partes além dos valores já devidos.
    </Item>
  </Shell>
);
