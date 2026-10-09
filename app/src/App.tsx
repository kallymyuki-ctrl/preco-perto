import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initMercadoPago,
  createPaymentPreference,
  generatePixQRCode,
  payWithCard,
  generateBoleto,
  validateCardData,
  formatCardNumber,
  formatCPF,
  formatExpirationDate,
  type PaymentMethod,
  type CartItem as MPCartItem,
  type BuyerData,
} from './lib/mercadopago';
import Login, { type UserData } from './components/Login';
import { TermsPage, PrivacyPage, PartnerRulesPage } from './components/LegalPages';
import SharedLists from './components/SharedLists';
import PriceHistory from './components/PriceHistory';
import { PriceAlerts, CashbackWallet, LoyaltyCard, BarcodeScanner, DeliveryTracking, Recipes, DigitalFlyers, DeliveryScheduling } from './components/Features';
import {
  IconHome, IconStore, IconMap, IconCart, IconUser, IconSearch, IconBell,
  IconHeart, IconCheck, IconPlus, IconClose, IconArrowLeft, IconArrowRight,
  IconShare, IconStar, IconLocation, IconClock, IconTag, IconTrending,
  IconWallet, IconGift, IconCamera, IconTruck, IconChef, IconCalendar,
  IconBook, IconChart, IconList, IconShield, IconLogout, IconSettings,
  IconSparkles, IconGoogle, IconApple, IconMail, IconLock, IconEye,
  IconEyeOff, IconFilter, IconPercent, IconCopy, IconPhone, IconChevronRight,
  IconChevronDown, IconMenu
} from './components/Icons';

/* =========================================================
   Marcas das lojas — arquivos locais (SVG gerado no projeto).
   São marcas próprias (iniciais + cor), não logotipos de
   terceiros: evita risco de marca registrada ao publicar.
   ========================================================= */
const STORE_LOGOS: Record<string, string> = {
  'Supermercado Zaffari': '/logos/zaffari.svg',
  'Nacional Hiper': '/logos/nacional.svg',
  'Carrefour Express': '/logos/carrefour.svg',
  'Assaí Atacadista': '/logos/assai.svg',
  'Farmácia São João': '/logos/saojoao.svg',
  'Panvel Farmácias': '/logos/panvel.svg',
  'Drogasil': '/logos/drogasil.svg',
  'Petz': '/logos/petz.svg',
  'Pet Shop AuAu': '/logos/auau.svg',
  'Burguer King POA': '/logos/zaffari.svg',
  'Big Supermercados': '/logos/big.svg',
  'Condor Atacadista': '/logos/condor.svg',
  'São Pedro Supermercados': '/logos/saopedro.svg',
  'Nacional Supermercados': '/logos/nacional.svg',
  'Ipiranga Supermercados': '/logos/ipiranga.svg',
  'Companhia do Lar': '/logos/companhiadolar.svg',
  'Farmácia Popular': '/logos/farmaciapopular.svg',
  'Farmácias Associadas': '/logos/associadas.svg',
  'Farmácia Esperança': '/logos/esperanca.svg',
  'Raia Drogasil': '/logos/raia.svg',
  'Cobasi': '/logos/cobasi.svg',
  'Pet Love': '/logos/petlove.svg',
  'Cobasi Pet': '/logos/cobasi.svg',
  'Meu Pet Shop': '/logos/meupetshop.svg',
};

/** Logo com fallback: se o arquivo não existir, mostra as iniciais. */
const StoreMark = ({ name, size = 56 }: { name: string; size?: number }) => {
  const [failed, setFailed] = useState(false);
  const src = STORE_LOGOS[name];

  if (!src || failed) {
    return (
      <div
        className="grid font-bold text-white rounded-xl bg-gradient-to-br from-[#0a1f1c] to-[#0f8b64]"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        aria-hidden="true"
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Marca de ${name}`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover' }}
    />
  );
};

const APP_LOGO = '/icon.svg';

const BANNERS = [
  { id: 1, image: '/banners/mercado.svg', title: 'Ofertas do Mercado', subtitle: 'Até 40% OFF' },
  { id: 2, image: '/banners/farmacia.svg', title: 'Saúde & Bem-estar', subtitle: 'Farmácia com desconto' },
  { id: 3, image: '/banners/pet.svg', title: 'Tudo para seu Pet', subtitle: 'Economize até 30%' },
];

/* =========================================================
   Dados
   ========================================================= */
interface Store {
  id: string;
  name: string;
  type: 'mercado' | 'farmacia' | 'pet';
  distance: string;
  address: string;
  rating: number;
  sponsored?: boolean;
  description: string;
  city: string;
  phone?: string;
  hours?: string;
  delivery?: boolean;
  deliveryFee?: number;
}

interface Product {
  id: string;
  name: string;
  category: 'mercado' | 'farmacia' | 'pet';
  emoji: string;
  price: number;
  oldPrice?: number;
  store: string;
  unit: string;
  promo?: boolean;
  brand?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type Page = 'home' | 'stores' | 'store-detail' | 'category' | 'cart' | 'profile' | 'checkout' | 'map' | 'partnerships' | 'hire' | 'contracts' | 'terms' | 'privacy' | 'partner-rules' | 'shared-lists' | 'price-history' | 'price-alerts' | 'cashback' | 'loyalty' | 'scanner' | 'tracking' | 'recipes' | 'flyers' | 'scheduling';

const STORES: Store[] = [
  { id: '1', name: 'Supermercado Zaffari', type: 'mercado', distance: '0.8 km', address: 'Av. Protásio Alves, 425', rating: 4.6, description: 'Supermercado premium com produtos selecionados e atendimento de qualidade.', city: 'Porto Alegre, RS', phone: '(51) 3222-1234', hours: '08:00 - 22:00', delivery: true, deliveryFee: 5.99 },
  { id: '2', name: 'Nacional Hiper', type: 'mercado', distance: '1.2 km', address: 'Rua Mostardeiro, 777', rating: 4.3, description: 'Hipermercado com variedade de produtos e preços competitivos.', city: 'Porto Alegre, RS', phone: '(51) 3333-5678', hours: '07:00 - 23:00', delivery: true, deliveryFee: 7.99 },
  { id: '6', name: 'Carrefour Express', type: 'mercado', distance: '0.5 km', address: 'Av. Nilo Peçanha, 150', rating: 4.2, sponsored: true, description: 'Supermercado de conveniência com produtos essenciais.', city: 'Porto Alegre, RS', phone: '(51) 3444-9012', hours: '07:00 - 23:00', delivery: true, deliveryFee: 4.99 },
  { id: '7', name: 'Assaí Atacadista', type: 'mercado', distance: '1.8 km', address: 'Av. Bento Gonçalves, 2500', rating: 4.4, description: 'Atacadista com preços imbatíveis para compras em quantidade.', city: 'Porto Alegre, RS', phone: '(51) 3555-3456', hours: '08:00 - 22:00', delivery: true, deliveryFee: 9.99 },
  { id: '10', name: 'Big Supermercados', type: 'mercado', distance: '2.1 km', address: 'Av. Ipiranga, 1200', rating: 4.1, description: 'Rede de supermercados com foco em economia.', city: 'Porto Alegre, RS', phone: '(51) 3666-7890', hours: '08:00 - 22:00', delivery: true, deliveryFee: 6.99 },
  { id: '11', name: 'Condor Atacadista', type: 'mercado', distance: '3.2 km', address: 'Av. Cavalhada, 3500', rating: 4.5, description: 'Atacadista com preços baixos para toda a família.', city: 'Porto Alegre, RS', phone: '(51) 3777-1234', hours: '08:00 - 22:00', delivery: true, deliveryFee: 8.99 },
  { id: '12', name: 'São Pedro Supermercados', type: 'mercado', distance: '1.5 km', address: 'Rua São Pedro, 890', rating: 4.3, description: 'Supermercado de bairro com produtos frescos.', city: 'Porto Alegre, RS', phone: '(51) 3888-5678', hours: '07:30 - 22:00', delivery: true, deliveryFee: 5.99 },
  { id: '13', name: 'Nacional Supermercados', type: 'mercado', distance: '2.8 km', address: 'Av. Farrapos, 1800', rating: 4.2, description: 'Supermercado tradicional com variedade de produtos.', city: 'Porto Alegre, RS', phone: '(51) 3999-9012', hours: '08:00 - 22:00', delivery: true, deliveryFee: 7.99 },
  { id: '14', name: 'Ipiranga Supermercados', type: 'mercado', distance: '1.9 km', address: 'Av. Ipiranga, 2400', rating: 4.0, description: 'Supermercado com foco em preços baixos.', city: 'Porto Alegre, RS', phone: '(51) 3111-3456', hours: '08:00 - 22:00', delivery: true, deliveryFee: 6.99 },
  { id: '15', name: 'Companhia do Lar', type: 'mercado', distance: '2.5 km', address: 'Rua da República, 567', rating: 4.4, description: 'Supermercado com produtos selecionados e orgânicos.', city: 'Porto Alegre, RS', phone: '(51) 3222-7890', hours: '08:00 - 22:00', delivery: true, deliveryFee: 5.99 },
  { id: '3', name: 'Farmácia São João', type: 'farmacia', distance: '0.3 km', address: 'Rua da Paz, 120', rating: 4.8, description: 'Farmácia completa com medicamentos, perfumaria e produtos de saúde.', city: 'Porto Alegre, RS', phone: '(51) 3333-1234', hours: '24 horas', delivery: true, deliveryFee: 3.99 },
  { id: '4', name: 'Panvel Farmácias', type: 'farmacia', distance: '0.6 km', address: 'Av. Cristóvão Colombo, 530', rating: 4.5, description: 'Rede de farmácias com foco em atendimento personalizado.', city: 'Porto Alegre, RS', phone: '(51) 3444-5678', hours: '07:00 - 23:00', delivery: true, deliveryFee: 4.99 },
  { id: '8', name: 'Drogasil', type: 'farmacia', distance: '0.4 km', address: 'Rua da República, 300', rating: 4.3, description: 'Rede nacional de farmácias com ampla variedade de produtos.', city: 'Porto Alegre, RS', phone: '(51) 3555-9012', hours: '07:00 - 23:00', delivery: true, deliveryFee: 4.99 },
  { id: '16', name: 'Farmácia Popular', type: 'farmacia', distance: '0.7 km', address: 'Rua Voluntários da Pátria, 456', rating: 4.2, description: 'Farmácia de bairro com preços acessíveis.', city: 'Porto Alegre, RS', phone: '(51) 3666-3456', hours: '08:00 - 22:00', delivery: true, deliveryFee: 3.99 },
  { id: '17', name: 'Farmácias Associadas', type: 'farmacia', distance: '1.1 km', address: 'Av. Independência, 789', rating: 4.4, description: 'Rede de farmácias com programas de fidelidade.', city: 'Porto Alegre, RS', phone: '(51) 3777-7890', hours: '07:00 - 23:00', delivery: true, deliveryFee: 4.99 },
  { id: '18', name: 'Farmácia Esperança', type: 'farmacia', distance: '0.9 km', address: 'Rua da Esperança, 234', rating: 4.6, description: 'Farmácia tradicional com atendimento humanizado.', city: 'Porto Alegre, RS', phone: '(51) 3888-1234', hours: '08:00 - 22:00', delivery: true, deliveryFee: 3.99 },
  { id: '19', name: 'Raia Drogasil', type: 'farmacia', distance: '1.3 km', address: 'Av. Protásio Alves, 1500', rating: 4.3, description: 'Maior rede de farmácias do Brasil.', city: 'Porto Alegre, RS', phone: '(51) 3999-5678', hours: '07:00 - 23:00', delivery: true, deliveryFee: 4.99 },
  { id: '5', name: 'Pet Shop AuAu', type: 'pet', distance: '1.0 km', address: 'Rua Padre Chagas, 88', rating: 4.7, description: 'Pet shop completo com produtos, serviços e banho e tosa.', city: 'Porto Alegre, RS', phone: '(51) 3111-1234', hours: '09:00 - 20:00', delivery: true, deliveryFee: 8.99 },
  { id: '9', name: 'Petz', type: 'pet', distance: '1.5 km', address: 'Shopping Iguatemi, Lj 204', rating: 4.6, description: 'Maior rede de pet shop do Brasil com tudo para seu pet.', city: 'Porto Alegre, RS', phone: '(51) 3222-5678', hours: '10:00 - 22:00', delivery: true, deliveryFee: 9.99 },
  { id: '20', name: 'Cobasi', type: 'pet', distance: '2.0 km', address: 'Av. Carlos Gomes, 1500', rating: 4.5, description: 'Pet shop com grande variedade e preços competitivos.', city: 'Porto Alegre, RS', phone: '(51) 3333-9012', hours: '09:00 - 21:00', delivery: true, deliveryFee: 7.99 },
  { id: '21', name: 'Pet Love', type: 'pet', distance: '1.8 km', address: 'Rua Miguel Tostes, 678', rating: 4.4, description: 'Pet shop com foco em produtos premium.', city: 'Porto Alegre, RS', phone: '(51) 3444-3456', hours: '09:00 - 20:00', delivery: true, deliveryFee: 8.99 },
  { id: '22', name: 'Cobasi Pet', type: 'pet', distance: '2.3 km', address: 'Av. Nilo Peçanha, 1800', rating: 4.3, description: 'Rede de pet shops com atendimento especializado.', city: 'Porto Alegre, RS', phone: '(51) 3555-7890', hours: '09:00 - 21:00', delivery: true, deliveryFee: 7.99 },
  { id: '23', name: 'Meu Pet Shop', type: 'pet', distance: '1.2 km', address: 'Rua da República, 456', rating: 4.6, description: 'Pet shop de bairro com carinho e dedicação.', city: 'Porto Alegre, RS', phone: '(51) 3666-1234', hours: '09:00 - 20:00', delivery: true, deliveryFee: 6.99 },
];

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Arroz Tio João 5kg', category: 'mercado', emoji: '🍚', price: 28.90, oldPrice: 34.90, store: 'Supermercado Zaffari', unit: 'pacote', promo: true, brand: 'Tio João' },
  { id: 'p4', name: 'Pão de Forma Pullman', category: 'mercado', emoji: '🍞', price: 9.90, oldPrice: 12.90, store: 'Supermercado Zaffari', unit: 'pacote', promo: true, brand: 'Pullman' },
  { id: 'p13', name: 'Macarrão Barilla 500g', category: 'mercado', emoji: '🍝', price: 11.90, store: 'Supermercado Zaffari', unit: 'pacote', brand: 'Barilla' },
  { id: 'p16', name: 'Óleo de Soja Liza 900ml', category: 'mercado', emoji: '🫗', price: 7.49, oldPrice: 9.90, store: 'Supermercado Zaffari', unit: 'garrafa', promo: true, brand: 'Liza' },
  { id: 'p17', name: 'Açúcar Cristal União 1kg', category: 'mercado', emoji: '🧂', price: 5.29, store: 'Supermercado Zaffari', unit: 'pacote', brand: 'União' },
  { id: 'p18', name: 'Farinha de Trigo Dona Benta 1kg', category: 'mercado', emoji: '🌾', price: 6.49, oldPrice: 7.99, store: 'Supermercado Zaffari', unit: 'pacote', promo: true, brand: 'Dona Benta' },
  { id: 'p19', name: 'Manteiga Qualy 500g', category: 'mercado', emoji: '🧈', price: 12.90, oldPrice: 15.90, store: 'Supermercado Zaffari', unit: 'pote', promo: true, brand: 'Qualy' },
  { id: 'p20', name: 'Cerveja Brahma 350ml Lata', category: 'mercado', emoji: '🍺', price: 3.49, oldPrice: 4.29, store: 'Supermercado Zaffari', unit: 'lata', promo: true, brand: 'Brahma' },
  { id: 'p2', name: 'Feijão Preto Camil 1kg', category: 'mercado', emoji: '🫘', price: 8.49, oldPrice: 10.90, store: 'Nacional Hiper', unit: 'pacote', promo: true, brand: 'Camil' },
  { id: 'p5', name: 'Café Melitta 500g', category: 'mercado', emoji: '☕', price: 18.90, oldPrice: 22.90, store: 'Nacional Hiper', unit: 'pacote', promo: true, brand: 'Melitta' },
  { id: 'p14', name: 'Chocolate Lacta 90g', category: 'mercado', emoji: '🍫', price: 7.90, oldPrice: 9.90, store: 'Nacional Hiper', unit: 'barra', promo: true, brand: 'Lacta' },
  { id: 'p21', name: 'Refrigerante Coca-Cola 2L', category: 'mercado', emoji: '🥤', price: 8.99, oldPrice: 10.99, store: 'Nacional Hiper', unit: 'garrafa', promo: true, brand: 'Coca-Cola' },
  { id: 'p22', name: 'Sabão em Pó Omo 1.6kg', category: 'mercado', emoji: '🧹', price: 22.90, oldPrice: 28.90, store: 'Nacional Hiper', unit: 'caixa', promo: true, brand: 'Omo' },
  { id: 'p23', name: 'Biscoito Oreo 144g', category: 'mercado', emoji: '🍪', price: 5.99, store: 'Nacional Hiper', unit: 'pacote', brand: 'Oreo' },
  { id: 'p24', name: 'Molho de Tomate Pomarola 340g', category: 'mercado', emoji: '🍅', price: 4.49, oldPrice: 5.99, store: 'Nacional Hiper', unit: 'vidro', promo: true, brand: 'Pomarola' },
  { id: 'p25', name: 'Presunto Sadia 200g', category: 'mercado', emoji: '🥓', price: 8.90, oldPrice: 11.90, store: 'Nacional Hiper', unit: 'pacote', promo: true, brand: 'Sadia' },
  { id: 'p3', name: 'Leite Integral Parmalat 1L', category: 'mercado', emoji: '🥛', price: 6.29, oldPrice: 7.49, store: 'Carrefour Express', unit: 'caixa', promo: true, brand: 'Parmalat' },
  { id: 'p6', name: 'Azeite Gallo 500ml', category: 'mercado', emoji: '🫒', price: 32.50, oldPrice: 38.90, store: 'Carrefour Express', unit: 'garrafa', promo: true, brand: 'Gallo' },
  { id: 'p26', name: 'Iogurte Danone Morango 850g', category: 'mercado', emoji: '🍓', price: 11.90, oldPrice: 14.90, store: 'Carrefour Express', unit: 'pote', promo: true, brand: 'Danone' },
  { id: 'p27', name: 'Queijo Mussarela Fatiado 200g', category: 'mercado', emoji: '🧀', price: 14.90, oldPrice: 18.90, store: 'Carrefour Express', unit: 'pacote', promo: true, brand: 'Mussarela' },
  { id: 'p28', name: 'Suco Del Valle 1L', category: 'mercado', emoji: '🧃', price: 7.99, store: 'Carrefour Express', unit: 'caixa', brand: 'Del Valle' },
  { id: 'p29', name: 'Papel Higiênico Neve 12 rolos', category: 'mercado', emoji: '🧻', price: 19.90, oldPrice: 24.90, store: 'Carrefour Express', unit: 'pacote', promo: true, brand: 'Neve' },
  { id: 'p30', name: 'Banana Prata kg', category: 'mercado', emoji: '🍌', price: 5.99, oldPrice: 7.99, store: 'Carrefour Express', unit: 'kg', promo: true },
  { id: 'p31', name: 'Maçã Fuji kg', category: 'mercado', emoji: '🍎', price: 8.99, store: 'Carrefour Express', unit: 'kg' },
  { id: 'p32', name: 'Arroz Parboilizado Tio João 5kg', category: 'mercado', emoji: '🍚', price: 24.90, oldPrice: 31.90, store: 'Assaí Atacadista', unit: 'pacote', promo: true, brand: 'Tio João' },
  { id: 'p33', name: 'Óleo de Soja Liza 900ml (pack 3un)', category: 'mercado', emoji: '🫗', price: 19.90, oldPrice: 27.90, store: 'Assaí Atacadista', unit: 'pack', promo: true, brand: 'Liza' },
  { id: 'p34', name: 'Açúcar Cristal 5kg', category: 'mercado', emoji: '🧂', price: 18.90, oldPrice: 24.90, store: 'Assaí Atacadista', unit: 'saco', promo: true, brand: 'União' },
  { id: 'p35', name: 'Café Pilão 500g', category: 'mercado', emoji: '☕', price: 15.90, oldPrice: 19.90, store: 'Assaí Atacadista', unit: 'pacote', promo: true, brand: 'Pilão' },
  { id: 'p36', name: 'Detergente Ypê 500ml (pack 5un)', category: 'mercado', emoji: '🧴', price: 9.90, oldPrice: 14.90, store: 'Assaí Atacadista', unit: 'pack', promo: true, brand: 'Ypê' },
  { id: 'p7', name: 'Dipirona 500mg 20 comp.', category: 'farmacia', emoji: '💊', price: 12.90, oldPrice: 16.90, store: 'Farmácia São João', unit: 'caixa', promo: true, brand: 'Genérico' },
  { id: 'p9', name: 'Protetor Solar FPS 50 120ml', category: 'farmacia', emoji: '🧴', price: 45.90, oldPrice: 59.90, store: 'Farmácia São João', unit: 'frasco', promo: true, brand: 'La Roche' },
  { id: 'p37', name: 'Paracetamol 750mg 20 comp.', category: 'farmacia', emoji: '💊', price: 8.90, oldPrice: 12.90, store: 'Farmácia São João', unit: 'caixa', promo: true, brand: 'Genérico' },
  { id: 'p38', name: 'Ibuprofeno 600mg 20 comp.', category: 'farmacia', emoji: '💊', price: 14.90, store: 'Farmácia São João', unit: 'caixa', brand: 'Genérico' },
  { id: 'p39', name: 'Vitamina D3 2000UI 60 caps', category: 'farmacia', emoji: '💛', price: 29.90, oldPrice: 39.90, store: 'Farmácia São João', unit: 'frasco', promo: true, brand: 'Lavitan' },
  { id: 'p40', name: 'Termômetro Digital', category: 'farmacia', emoji: '🌡️', price: 24.90, oldPrice: 34.90, store: 'Farmácia São João', unit: 'unidade', promo: true },
  { id: 'p41', name: 'Álcool Gel 500ml', category: 'farmacia', emoji: '🧴', price: 12.90, oldPrice: 16.90, store: 'Farmácia São João', unit: 'frasco', promo: true, brand: 'São João' },
  { id: 'p42', name: 'Máscara PFF2 (pack 5un)', category: 'farmacia', emoji: '😷', price: 19.90, store: 'Farmácia São João', unit: 'pack' },
  { id: 'p8', name: 'Vitamina C 1g Efervescente', category: 'farmacia', emoji: '🍊', price: 24.50, oldPrice: 32.90, store: 'Panvel Farmácias', unit: 'tubo', promo: true, brand: 'Redoxon' },
  { id: 'p15', name: 'Creme Dental Colgate 180g', category: 'farmacia', emoji: '🪥', price: 9.90, oldPrice: 13.90, store: 'Panvel Farmácias', unit: 'tubo', promo: true, brand: 'Colgate' },
  { id: 'p43', name: 'Shampoo Pantene 400ml', category: 'farmacia', emoji: '🧴', price: 29.90, oldPrice: 39.90, store: 'Panvel Farmácias', unit: 'frasco', promo: true, brand: 'Pantene' },
  { id: 'p44', name: 'Desodorante Dove 150ml', category: 'farmacia', emoji: '🧴', price: 16.90, oldPrice: 21.90, store: 'Panvel Farmácias', unit: 'frasco', promo: true, brand: 'Dove' },
  { id: 'p45', name: 'Fraldas Pampers M 30un', category: 'farmacia', emoji: '👶', price: 49.90, oldPrice: 64.90, store: 'Panvel Farmácias', unit: 'pacote', promo: true, brand: 'Pampers' },
  { id: 'p46', name: 'Lenço Umedecido 168 folhas', category: 'farmacia', emoji: '🧻', price: 19.90, store: 'Panvel Farmácias', unit: 'pacote', brand: 'Pampers' },
  { id: 'p47', name: 'Escova Dental Oral-B', category: 'farmacia', emoji: '🪥', price: 14.90, oldPrice: 19.90, store: 'Panvel Farmácias', unit: 'unidade', promo: true, brand: 'Oral-B' },
  { id: 'p48', name: 'Fio Dental Oral-B 25m', category: 'farmacia', emoji: '🦷', price: 9.90, store: 'Panvel Farmácias', unit: 'unidade', brand: 'Oral-B' },
  { id: 'p49', name: 'Neosaldina 20 drágeas', category: 'farmacia', emoji: '💊', price: 22.90, oldPrice: 29.90, store: 'Drogasil', unit: 'caixa', promo: true, brand: 'Neosaldina' },
  { id: 'p50', name: 'Resfenol 12 caps', category: 'farmacia', emoji: '💊', price: 18.90, oldPrice: 24.90, store: 'Drogasil', unit: 'caixa', promo: true, brand: 'Resfenol' },
  { id: 'p51', name: 'Hidratante Nivea 400ml', category: 'farmacia', emoji: '🧴', price: 24.90, oldPrice: 32.90, store: 'Drogasil', unit: 'frasco', promo: true, brand: 'Nivea' },
  { id: 'p52', name: 'Protetor Solar La Roche 50ml', category: 'farmacia', emoji: '☀️', price: 79.90, oldPrice: 99.90, store: 'Drogasil', unit: 'frasco', promo: true, brand: 'La Roche' },
  { id: 'p53', name: 'Multivitamínico Centrum 30comp', category: 'farmacia', emoji: '💊', price: 39.90, oldPrice: 49.90, store: 'Drogasil', unit: 'frasco', promo: true, brand: 'Centrum' },
  { id: 'p10', name: 'Ração Golden Premium 15kg', category: 'pet', emoji: '🐕', price: 129.90, oldPrice: 159.90, store: 'Pet Shop AuAu', unit: 'saco', promo: true, brand: 'Golden' },
  { id: 'p11', name: 'Areia Higiênica Pipicat 4kg', category: 'pet', emoji: '🐱', price: 22.90, oldPrice: 29.90, store: 'Pet Shop AuAu', unit: 'pacote', promo: true, brand: 'Pipicat' },
  { id: 'p12', name: 'Shampoo para Cães 500ml', category: 'pet', emoji: '🧼', price: 19.90, store: 'Pet Shop AuAu', unit: 'frasco', brand: 'Sanol' },
  { id: 'p54', name: 'Sachê Whiskas (pack 12un)', category: 'pet', emoji: '🐱', price: 24.90, oldPrice: 32.90, store: 'Pet Shop AuAu', unit: 'pack', promo: true, brand: 'Whiskas' },
  { id: 'p55', name: 'Petisco Pedigree Dentastix', category: 'pet', emoji: '🦴', price: 15.90, oldPrice: 19.90, store: 'Pet Shop AuAu', unit: 'pacote', promo: true, brand: 'Pedigree' },
  { id: 'p56', name: 'Coleira Antipulgas 40cm', category: 'pet', emoji: '🐕', price: 39.90, oldPrice: 49.90, store: 'Pet Shop AuAu', unit: 'unidade', promo: true, brand: 'Seresto' },
  { id: 'p57', name: 'Brinquedo Mordedor', category: 'pet', emoji: '🎾', price: 12.90, store: 'Pet Shop AuAu', unit: 'unidade' },
  { id: 'p58', name: 'Comedouro Inox Médio', category: 'pet', emoji: '🥣', price: 24.90, oldPrice: 34.90, store: 'Pet Shop AuAu', unit: 'unidade', promo: true },
  { id: 'p59', name: 'Ração Royal Canin 10.1kg', category: 'pet', emoji: '🐕', price: 189.90, oldPrice: 229.90, store: 'Petz', unit: 'saco', promo: true, brand: 'Royal Canin' },
  { id: 'p60', name: 'Areia Sanitária Cat Chow 4kg', category: 'pet', emoji: '🐱', price: 29.90, oldPrice: 37.90, store: 'Petz', unit: 'pacote', promo: true, brand: 'Cat Chow' },
  { id: 'p61', name: 'Banho + Tosa Porte Médio', category: 'pet', emoji: '🛁', price: 59.90, oldPrice: 79.90, store: 'Petz', unit: 'serviço', promo: true },
  { id: 'p62', name: 'Ração Premier Gatos 3kg', category: 'pet', emoji: '🐱', price: 69.90, oldPrice: 84.90, store: 'Petz', unit: 'saco', promo: true, brand: 'Premier' },
  { id: 'p63', name: 'Vacina V10 Canina', category: 'pet', emoji: '💉', price: 120.00, store: 'Petz', unit: 'dose' },
  { id: 'p64', name: 'Transportadora Gato M', category: 'pet', emoji: '🐱', price: 89.90, oldPrice: 119.90, store: 'Petz', unit: 'unidade', promo: true },
];

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const getDiscount = (price: number, oldPrice?: number) => (oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'mercado' | 'farmacia' | 'pet'>('mercado');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [cityName, setCityName] = useState('Porto Alegre, RS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [buyerData, setBuyerData] = useState<BuyerData>({ email: '', firstName: '', lastName: '', identification: { type: 'CPF', number: '' } });
  const [cardData, setCardData] = useState({ number: '', holderName: '', expirationMonth: '', expirationYear: '', cvv: '', cpf: '', installments: 1 });
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; expiration_date: string; mock?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'pending' | 'failure'>('idle');
  const [paymentError, setPaymentError] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Inicializa o SDK do Mercado Pago (apenas com a Public Key). */
  useEffect(() => {
    initMercadoPago().catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentBanner((prev) => (prev + 1) % BANNERS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem('precoperto-cart');
    const savedFavs = localStorage.getItem('precoperto-favorites');
    const savedCity = localStorage.getItem('precoperto-city');
    const savedUser = localStorage.getItem('precoperto-user');
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedCity) setCityName(savedCity);
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => { localStorage.setItem('precoperto-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('precoperto-favorites', JSON.stringify(favorites)); }, [favorites]);

  const handleLogin = (user: UserData) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('precoperto-user', JSON.stringify(user));
    showToastMessage(`Bem-vindo, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('precoperto-user');
    showToastMessage('Até logo!');
  };

  const showToastMessage = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 2500);
  }, []);

  const navigate = (page: Page, store?: Store, category?: 'mercado' | 'farmacia' | 'pet') => {
    setCurrentPage(page);
    if (store) setSelectedStore(store);
    if (category) setSelectedCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      return [...prev, { product, quantity: 1 }];
    });
    showToastMessage(`${product.name} adicionado!`);
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((item) => item.product.id !== productId));

  const clearCart = () => { setCart([]); showToastMessage('Lista limpa!'); };

  const toggleFavorite = (storeId: string) => {
    setFavorites((prev) => {
      if (prev.includes(storeId)) {
        showToastMessage('Removido dos favoritos');
        return prev.filter((id) => id !== storeId);
      }
      showToastMessage('Adicionado aos favoritos');
      return [...prev, storeId];
    });
  };

  const changeCity = () => {
    const cities = ['Porto Alegre, RS', 'São Paulo, SP', 'Rio de Janeiro, RJ', 'Curitiba, PR', 'Florianópolis, SC'];
    const nextCity = cities[(cities.indexOf(cityName) + 1) % cities.length];
    setCityName(nextCity);
    localStorage.setItem('precoperto-city', nextCity);
    showToastMessage(`Cidade alterada para ${nextCity}`);
  };

  const isInCart = (productId: string) => cart.some((item) => item.product.id === productId);

  const totalSavings = cart.reduce((acc, item) => acc + (item.product.oldPrice ? (item.product.oldPrice - item.product.price) * item.quantity : 0), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const pixTotal = cartTotal * 0.95; // 5% de desconto no PIX

  const processPayment = async () => {
    setPaymentError('');
    setIsProcessing(true);
    try {
      if (!buyerData.email || !buyerData.firstName || !buyerData.identification.number) {
        showToastMessage('Preencha todos os dados do comprador');
        setIsProcessing(false);
        return;
      }

      const items: MPCartItem[] = cart.map((item) => ({
        id: item.product.id,
        title: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      if (paymentMethod === 'pix') {
        const pix = await generatePixQRCode(pixTotal, 'Preço Perto - Compra');
        setPixData(pix);
        setPaymentStatus('pending');
        showToastMessage(pix.mock ? 'QR Code de demonstração gerado.' : 'QR Code PIX gerado!');
        return;
      }

      const preference = await createPaymentPreference(items, buyerData);
      if (!preference?.id) throw new Error('Não foi possível criar a preferência de pagamento.');

      if (paymentMethod === 'credit_card') {
        const validation = validateCardData(cardData);
        if (!validation.valid) {
          setPaymentStatus('failure');
          setPaymentError(validation.errors[0]);
          showToastMessage(validation.errors[0]);
          setIsProcessing(false);
          return;
        }
        const result = await payWithCard(cardData, buyerData, cartTotal);
        if (result.status === 'approved') {
          setPaymentStatus('success');
          showToastMessage('Pagamento aprovado!');
          setTimeout(() => { setCurrentPage('home'); setCart([]); }, 2500);
        } else {
          setPaymentStatus('failure');
          setPaymentError(result.message || 'Pagamento recusado pela operadora.');
        }
        return;
      }

      const boleto = await generateBoleto(cartTotal, buyerData);
      setPaymentStatus(boleto.status === 'approved' ? 'success' : 'pending');
      showToastMessage(boleto.id ? `Boleto gerado (${boleto.id})` : 'Boleto gerado!');
    } catch (error) {
      console.error('Erro no pagamento:', error);
      setPaymentStatus('failure');
      setPaymentError(error instanceof Error ? error.message : 'Erro ao processar pagamento.');
      showToastMessage('Erro ao processar pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const searchResults = searchQuery.length > 1 ? [
    ...PRODUCTS.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase())),
    ...STORES.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
  ] : [];

  /* ======================= PÁGINAS ======================= */

  const renderHomePage = () => (
    <div className="animate-fadeIn">
      <div className="hero">
        <div className="hero-content">
          <div className="flex items-center gap-2 mb-4">
            <div className="grid w-10 h-10 rounded-xl place-items-center bg-white/10 backdrop-blur">
              <IconSparkles className="text-white" size={20} />
            </div>
            <span className="text-sm font-medium text-white/80">Economia inteligente</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold leading-tight">Compare preços e economize em cada compra</h1>
          <p className="mb-6 text-sm leading-relaxed text-white/80">
            Encontre os melhores preços em supermercados, farmácias e pet shops perto de você.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('stores')} className="btn btn-primary bg-white text-accent hover:bg-white/90">
              <IconStore size={18} /> Ver lojas
            </button>
            <button onClick={() => navigate('shared-lists')} className="btn btn-secondary bg-white/10 text-white border-white/20 hover:bg-white/20">
              <IconList size={18} /> Minha lista
            </button>
          </div>
        </div>
        <div className="hero-bag" aria-hidden="true">🛍️</div>
      </div>

      <div className="relative z-10 px-4 -mt-6 mb-6">
        <div className="search-bar shadow-lg">
          <IconSearch className="text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar lojas, produtos ou marcas..."
            aria-label="Buscar lojas, produtos ou marcas"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 border-0 bg-transparent" aria-label="Limpar busca">
              <IconClose size={18} />
            </button>
          )}
        </div>
      </div>

      {searchQuery.length > 1 && (
        <div className="p-4 mx-4 mb-5 bg-white border rounded-2xl border-line animate-scaleIn">
          <h3 className="m-0 mb-3 text-sm font-bold">Resultados ({searchResults.length})</h3>
          <div className="space-y-2 overflow-y-auto max-h-[300px]">
            {searchResults.slice(0, 10).map((result) => {
              if ('type' in result) {
                const store = result as Store;
                return (
                  <button key={`s-${store.id}`} onClick={() => { navigate('store-detail', store); setSearchQuery(''); }} className="flex items-center w-full gap-3 p-2 text-left border-0 rounded-xl bg-transparent hover:bg-slate-50">
                    <StoreMark name={store.name} size={40} />
                    <div className="flex-1">
                      <div className="text-sm font-bold">{store.name}</div>
                      <div className="text-xs text-slate-500">{store.type} • {store.distance}</div>
                    </div>
                  </button>
                );
              }
              const product = result as Product;
              return (
                <button key={`p-${product.id}`} onClick={() => { addToCart(product); setSearchQuery(''); }} className="flex items-center w-full gap-3 p-2 text-left border-0 rounded-xl bg-transparent hover:bg-slate-50">
                  <div className="grid w-10 h-10 text-2xl rounded-lg place-items-center bg-slate-50">{product.emoji}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{product.name}</div>
                    <div className="text-xs text-slate-500">{product.store} • {formatCurrency(product.price)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header"><h2 className="section-title">Categorias</h2></div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'mercado' as const, icon: <IconStore size={28} />, label: 'Mercado' },
            { key: 'farmacia' as const, icon: <IconShield size={28} />, label: 'Farmácia' },
            { key: 'pet' as const, icon: <IconHeart size={28} />, label: 'Pet Shop' },
          ].map((cat) => (
            <button key={cat.key} onClick={() => navigate('category', undefined, cat.key)} className="text-center card card-interactive">
              <div className="grid w-14 h-14 mx-auto mb-3 rounded-2xl place-items-center bg-accent-light text-accent">{cat.icon}</div>
              <div className="mb-1 text-sm font-semibold">{cat.label}</div>
              <div className="text-xs text-slate-500">{PRODUCTS.filter((p) => p.category === cat.key).length} produtos</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="grid grid-cols-4 gap-3">
          {[
            { page: 'shared-lists' as Page, icon: <IconList size={24} />, label: 'Listas' },
            { page: 'scanner' as Page, icon: <IconCamera size={24} />, label: 'Scanner' },
            { page: 'price-alerts' as Page, icon: <IconBell size={24} />, label: 'Alertas' },
            { page: 'cashback' as Page, icon: <IconWallet size={24} />, label: 'Cashback' },
          ].map((action) => (
            <button key={action.page} onClick={() => navigate(action.page)} className="text-center card card-interactive">
              <div className="grid w-12 h-12 mx-auto mb-2 rounded-xl place-items-center bg-accent-light text-accent">{action.icon}</div>
              <div className="text-xs font-semibold">{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="px-4 mb-3 flex items-center justify-between">
          <h2 className="m-0 text-xl font-bold font-display">Lojas Parceiras</h2>
          <button onClick={() => navigate('stores')} className="text-sm font-bold border-0 bg-transparent text-accent">Ver todas →</button>
        </div>
        <div className="flex gap-3 px-4 pb-2 overflow-x-auto scroll-hidden">
          {STORES.slice(0, 6).map((store) => (
            <button key={store.id} onClick={() => navigate('store-detail', store)} className="flex-shrink-0 w-[140px] p-3 text-left bg-white border rounded-2xl border-line card-3d">
              <StoreMark name={store.name} size={64} />
              <div className="mt-2 text-xs font-bold truncate">{store.name}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">★ {store.rating} • {store.distance}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Ofertas do Dia</h2>
          <button onClick={() => navigate('category', undefined, 'mercado')} className="section-link">
            Ver todas <IconChevronRight size={16} />
          </button>
        </div>
        <div className="grid gap-3">
          {PRODUCTS.filter((p) => p.promo).slice(0, 5).map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">{product.emoji}</div>
              <div className="product-info">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="product-name">{product.name}</div>
                  <span className="badge badge-discount">
                    <IconPercent size={12} /> -{getDiscount(product.price, product.oldPrice)}%
                  </span>
                </div>
                <div className="product-store">{product.store}</div>
                <div className="flex items-center gap-2">
                  {product.oldPrice && <span className="product-price-old">{formatCurrency(product.oldPrice)}</span>}
                  <span className="product-price">{formatCurrency(product.price)}</span>
                </div>
              </div>
              <button
                onClick={() => addToCart(product)}
                className={`w-10 h-10 flex items-center justify-center border-0 rounded-xl transition-all ${isInCart(product.id) ? 'bg-accent text-white' : 'bg-accent-light text-accent hover:bg-accent hover:text-white'}`}
                aria-label={isInCart(product.id) ? `Remover ${product.name} da lista` : `Adicionar ${product.name} à lista`}
              >
                {isInCart(product.id) ? <IconCheck size={20} /> : <IconPlus size={20} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStoresPage = () => (
    <div className="animate-fadeIn">
      <div className="section">
        <div className="section-header"><h2 className="section-title">Todas as Lojas</h2></div>
        <div className="grid gap-3">
          {STORES.map((store) => (
            <button key={store.id} onClick={() => navigate('store-detail', store)} className="store-card">
              <StoreMark name={store.name} size={56} />
              <div className="store-info">
                <div className="store-name">{store.name}</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <IconLocation size={12} /> {store.distance}
                  </span>
                  <span className="store-rating"><IconStar size={12} filled /> {store.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-new">{store.type}</span>
                  {store.delivery && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <IconTruck size={12} /> Entrega
                    </span>
                  )}
                </div>
              </div>
              <IconChevronRight className="text-slate-300" size={20} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStoreDetailPage = () => {
    if (!selectedStore) return null;
    const storeProducts = PRODUCTS.filter((p) => p.store === selectedStore.name);

    return (
      <div className="animate-fadeIn">
        <button onClick={() => navigate('stores')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
        <div className="mx-4 p-5 mb-5 border rounded-3xl border-line bg-gradient-to-br from-accent-light to-white">
          <div className="flex items-start gap-4">
            <StoreMark name={selectedStore.name} size={80} />
            <div className="flex-1">
              <h2 className="m-0 text-xl font-bold font-display">{selectedStore.name}</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">{selectedStore.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm font-bold text-accent-dark">📍 {selectedStore.distance}</span>
                <span className="text-sm text-slate-500">★ {selectedStore.rating}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2 text-center bg-white rounded-xl">
              <div className="text-xs text-slate-500">Horário</div>
              <div className="text-xs font-bold">{selectedStore.hours}</div>
            </div>
            <div className="p-2 text-center bg-white rounded-xl">
              <div className="text-xs text-slate-500">Entrega</div>
              <div className="text-xs font-bold">{selectedStore.delivery ? formatCurrency(selectedStore.deliveryFee || 0) : 'Não'}</div>
            </div>
          </div>

          <button
            onClick={() => toggleFavorite(selectedStore.id)}
            className={`w-full py-3 mt-4 text-sm font-bold border-2 rounded-xl transition-colors ${favorites.includes(selectedStore.id) ? 'text-white bg-danger border-danger' : 'text-accent-dark bg-white border-accent hover:bg-accent-light'}`}
          >
            {favorites.includes(selectedStore.id) ? 'Favoritada' : 'Adicionar aos Favoritos'}
          </button>
        </div>

        <div className="px-4">
          <h3 className="m-0 mb-3 text-lg font-bold font-display">Produtos ({storeProducts.length})</h3>
          {storeProducts.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed rounded-[20px] border-slate-300">
              <div className="mb-2 text-4xl">📦</div>
              <p className="m-0 text-sm text-slate-500">Esta loja ainda não tem produtos cadastrados.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {storeProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-image">{product.emoji}</div>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-store">{product.unit}</div>
                    <div className="flex items-center gap-2">
                      {product.oldPrice && <span className="product-price-old">{formatCurrency(product.oldPrice)}</span>}
                      <span className="product-price">{formatCurrency(product.price)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className={`w-10 h-10 flex items-center justify-center border-0 rounded-xl ${isInCart(product.id) ? 'bg-accent text-white' : 'bg-accent-light text-accent'}`}
                    aria-label={isInCart(product.id) ? `Remover ${product.name} da lista` : `Adicionar ${product.name} à lista`}
                  >
                    {isInCart(product.id) ? <IconCheck size={20} /> : <IconPlus size={20} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCategoryPage = () => {
    const categoryProducts = PRODUCTS.filter((p) => p.category === selectedCategory);
    const categoryStores = STORES.filter((s) => s.type === selectedCategory);
    const names = { mercado: 'Mercado', farmacia: 'Farmácia', pet: 'Pet Shop' };
    const icons = {
      mercado: <IconStore size={32} />,
      farmacia: <IconShield size={32} />,
      pet: <IconHeart size={32} />,
    };

    return (
      <div className="animate-fadeIn">
        <button onClick={() => navigate('home')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
        <div className="mx-4 p-5 mb-5 border rounded-3xl border-line bg-gradient-to-br from-accent-light to-white">
          <div className="mb-3 text-accent">{icons[selectedCategory]}</div>
          <h2 className="m-0 text-2xl font-bold font-display">{names[selectedCategory]}</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">{categoryProducts.length} produtos disponíveis</p>
        </div>

        <div className="px-4 mb-6">
          <h3 className="m-0 mb-3 text-lg font-bold font-display">Lojas ({categoryStores.length})</h3>
          <div className="flex gap-3 pb-2 overflow-x-auto scroll-hidden">
            {categoryStores.map((store) => (
              <button key={store.id} onClick={() => navigate('store-detail', store)} className="flex-shrink-0 w-[140px] p-3 text-left bg-white border rounded-2xl border-line card-3d">
                <StoreMark name={store.name} size={64} />
                <div className="mt-2 text-xs font-bold truncate">{store.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-500">★ {store.rating}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <h3 className="m-0 mb-3 text-lg font-bold font-display">Produtos</h3>
          <div className="grid gap-3">
            {categoryProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">{product.emoji}</div>
                <div className="product-info">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="product-name">{product.name}</div>
                    {product.promo && (
                      <span className="badge badge-discount">
                        <IconPercent size={12} /> -{getDiscount(product.price, product.oldPrice)}%
                      </span>
                    )}
                  </div>
                  <div className="product-store">{product.store}</div>
                  <div className="flex items-center gap-2">
                    {product.oldPrice && <span className="product-price-old">{formatCurrency(product.oldPrice)}</span>}
                    <span className="product-price">{formatCurrency(product.price)}</span>
                  </div>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className={`w-10 h-10 flex items-center justify-center border-0 rounded-xl ${isInCart(product.id) ? 'bg-accent text-white' : 'bg-accent-light text-accent'}`}
                  aria-label={isInCart(product.id) ? `Remover ${product.name} da lista` : `Adicionar ${product.name} à lista`}
                >
                  {isInCart(product.id) ? <IconCheck size={20} /> : <IconPlus size={20} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMapPage = () => (
    <div className="animate-fadeIn">
      <button onClick={() => navigate('home')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
      <div className="px-4">
        <h2 className="m-0 mb-4 text-2xl font-bold font-display">Mapa de Lojas</h2>
        <div className="mb-4 map-container">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-6xl">🗺️</div>
              <div className="text-sm font-bold text-slate-700">Mapa Interativo</div>
              <div className="mt-1 text-xs text-slate-500">{STORES.length} lojas em {cityName}</div>
            </div>
          </div>
          {STORES.slice(0, 10).map((store, i) => (
            <button
              key={store.id}
              onClick={() => navigate('store-detail', store)}
              className="absolute grid w-10 h-10 overflow-hidden bg-white rounded-full shadow-lg place-items-center border-2 border-accent hover:scale-110 transition-transform"
              style={{ top: `${18 + ((i * 7) % 60)}%`, left: `${8 + ((i * 13) % 74)}%` }}
              aria-label={`Ver ${store.name}`}
            >
              <StoreMark name={store.name} size={36} />
            </button>
          ))}
        </div>

        <h3 className="m-0 mb-3 text-lg font-bold font-display">Lojas Próximas</h3>
        <div className="grid gap-3">
          {STORES.slice(0, 5).map((store) => (
            <button key={store.id} onClick={() => navigate('store-detail', store)} className="flex items-center w-full gap-3 p-3 text-left bg-white border rounded-2xl border-line card-interactive">
              <StoreMark name={store.name} size={48} />
              <div className="flex-1">
                <div className="text-sm font-bold">{store.name}</div>
                <div className="text-xs text-slate-500">{store.distance} • {store.address}</div>
              </div>
              <IconChevronRight className="text-accent" size={18} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPartnershipsPage = () => (
    <div className="animate-fadeIn">
      <button onClick={() => navigate('home')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
      <div className="mx-4 p-6 mb-5 text-white border-0 rounded-3xl bg-gradient-to-br from-[#0a1f1c] to-accent">
        <div className="mb-3 text-5xl">🤝</div>
        <h2 className="m-0 text-2xl font-bold font-display">Seja um Parceiro</h2>
        <p className="m-0 mt-2 text-sm opacity-90">Ganhe dinheiro divulgando o Preço Perto e ajude pessoas a economizarem!</p>
      </div>
      <div className="grid gap-3 px-4 mb-5">
        <div className="p-4 bg-white border rounded-2xl border-line">
          <div className="mb-2 text-3xl">💰</div>
          <h3 className="m-0 text-base font-bold">Ganhe Comissões</h3>
          <p className="m-0 mt-1 text-sm text-slate-500">Receba até 15% de comissão por cada venda realizada pelo seu link.</p>
        </div>
        <div className="p-4 bg-white border rounded-2xl border-line">
          <div className="mb-2 text-3xl">🎁</div>
          <h3 className="m-0 text-base font-bold">Cupons Exclusivos</h3>
          <p className="m-0 mt-1 text-sm text-slate-500">Crie cupons personalizados para seus seguidores e ganhe bônus.</p>
        </div>
        <div className="p-4 bg-white border rounded-2xl border-line">
          <div className="mb-2 text-3xl">📊</div>
          <h3 className="m-0 text-base font-bold">Painel Completo</h3>
          <p className="m-0 mt-1 text-sm text-slate-500">Acompanhe vendas, comissões e desempenho em tempo real.</p>
        </div>
      </div>
      <div className="px-4">
        <button onClick={() => navigate('hire')} className="w-full py-4 text-sm font-bold text-white border-0 rounded-2xl shadow-lg bg-gradient-to-r from-[#0a1f1c] to-accent">
          Quero Ser Parceiro →
        </button>
      </div>
    </div>
  );

  const renderHirePage = () => (
    <div className="animate-fadeIn">
      <button onClick={() => navigate('home')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
      <div className="px-4">
        <h2 className="m-0 mb-4 text-2xl font-bold font-display">Trabalhe Conosco</h2>
        <div className="grid gap-3">
          {[
            { icon: '🛒', title: 'Entregador Parceiro', text: 'Faça entregas e ganhe por corrida. Horários flexíveis.', money: 'Ganhe até R$ 3.000/mês', color: 'from-blue-50 to-blue-100 border-blue-200 text-blue-900' },
            { icon: '📱', title: 'Divulgador Digital', text: 'Divulgue o app nas redes sociais e ganhe comissões.', money: 'Ganhe até 15% por venda', color: 'from-green-50 to-green-100 border-green-200 text-green-900' },
            { icon: '🏪', title: 'Representante de Loja', text: 'Cadastre sua loja e alcance mais clientes.', money: 'Planos a partir de R$ 99/mês', color: 'from-purple-50 to-purple-100 border-purple-200 text-purple-900' },
          ].map((job) => (
            <button key={job.title} onClick={() => navigate('contracts')} className={`w-full p-5 text-left border-2 rounded-2xl bg-gradient-to-br ${job.color} card-3d`}>
              <div className="mb-2 text-4xl">{job.icon}</div>
              <h3 className="m-0 text-lg font-bold">{job.title}</h3>
              <p className="m-0 mt-1 text-sm opacity-80">{job.text}</p>
              <div className="mt-3 text-xs font-bold">💰 {job.money}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContractsPage = () => (
    <div className="animate-fadeIn">
      <button onClick={() => navigate('hire')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
      <div className="px-4">
        <h2 className="m-0 mb-4 text-2xl font-bold font-display">Contrato de Parceria</h2>
        <div className="p-5 mb-4 bg-white border rounded-2xl border-line">
          <h3 className="m-0 mb-3 text-base font-bold">Termos e Condições</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <p>1. O parceiro se compromete a divulgar o app Preço Perto de forma ética e profissional.</p>
            <p>2. As comissões serão pagas mensalmente via PIX ou transferência bancária.</p>
            <p>3. O parceiro terá acesso a materiais de divulgação e suporte da equipe.</p>
            <p>4. É proibido usar práticas enganosas ou falsas para promover o app.</p>
            <p>5. O contrato pode ser rescindido por qualquer parte com aviso prévio de 30 dias.</p>
          </div>
        </div>
        <div className="p-5 mb-4 bg-white border rounded-2xl border-line">
          <h3 className="m-0 mb-3 text-base font-bold">Seus Dados</h3>
          <div className="space-y-2">
            <input type="text" placeholder="Nome completo" className="input" />
            <input type="email" placeholder="E-mail" className="input" />
            <input type="tel" placeholder="Telefone/WhatsApp" className="input" />
            <input type="text" placeholder="CPF/CNPJ" className="input" />
            <select className="input" defaultValue="">
              <option value="" disabled>Selecione a modalidade</option>
              <option>Entregador Parceiro</option>
              <option>Divulgador Digital</option>
              <option>Representante de Loja</option>
            </select>
          </div>
        </div>
        <button onClick={() => showToastMessage('Contrato enviado com sucesso!')} className="w-full py-4 text-sm font-bold text-white border-0 rounded-2xl shadow-lg bg-gradient-to-r from-[#0a1f1c] to-accent">
          Assinar Contrato Digital
        </button>
      </div>
    </div>
  );

  const renderCartPage = () => (
    <div className="animate-fadeIn">
      <div className="px-4">
        <h2 className="m-0 mb-4 text-2xl font-bold font-display">Lista de Compras</h2>
        {cart.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed rounded-[20px] border-slate-300">
            <div className="mb-2 text-5xl">🛒</div>
            <h3 className="m-0 mb-2 text-lg font-bold">Lista vazia</h3>
            <p className="max-w-[250px] m-0 mx-auto mb-4 text-sm text-slate-500">Adicione produtos para começar sua lista de compras.</p>
            <button onClick={() => navigate('home')} className="px-6 py-3 text-sm font-bold text-white border-0 rounded-xl bg-accent">Explorar Produtos</button>
          </div>
        ) : (
          <>
            <div className="p-4 mb-4 text-white rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex items-center justify-between mb-2"><span className="text-sm">Total de itens:</span><b className="text-teal-300">{totalItems}</b></div>
              <div className="flex items-center justify-between mb-2"><span className="text-sm">Valor total:</span><b className="text-teal-300">{formatCurrency(cartTotal)}</b></div>
              {totalSavings > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <span className="text-sm">Economia:</span><b className="text-teal-300">{formatCurrency(totalSavings)}</b>
                </div>
              )}
            </div>

            <div className="grid gap-3 mb-4">
              {cart.map((item) => (
                <div key={item.product.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 p-3 bg-white border rounded-2xl border-line">
                  <div className="grid w-12 h-12 text-2xl rounded-xl place-items-center bg-slate-50">{item.product.emoji}</div>
                  <div>
                    <h4 className="m-0 text-sm font-semibold">{item.product.name}</h4>
                    <p className="m-0 text-xs text-slate-500">Qtd: {item.quantity}</p>
                    <p className="m-0 mt-1 text-sm font-bold text-accent">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-2 border-0 rounded-xl text-danger bg-red-50" aria-label={`Remover ${item.product.name}`}>✕</button>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <button onClick={() => navigate('checkout')} className="w-full py-4 text-sm font-bold text-white border-0 rounded-2xl shadow-lg bg-gradient-to-r from-[#0a1f1c] to-accent">
                Finalizar Compra
              </button>
              <button onClick={clearCart} className="w-full py-3 text-sm font-bold border-2 rounded-2xl text-danger bg-red-50 border-red-100">Limpar Lista</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderCheckoutPage = () => (
    <div className="animate-fadeIn">
      <button onClick={() => navigate('cart')} className="px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">← Voltar</button>
      <div className="px-4">
        <h2 className="m-0 mb-4 text-2xl font-bold font-display">Pagamento</h2>

        {paymentStatus === 'pending' && pixData && (
          <div className="p-5 mb-4 bg-white border-2 rounded-2xl border-blue-500">
            <div className="mb-4 text-center">
              <div className="mb-2 text-5xl">⚡</div>
              <h3 className="m-0 text-lg font-bold text-blue-600">Pagamento PIX</h3>
              {pixData.mock && <p className="m-0 mt-1 text-xs text-slate-500">Modo demonstração — nenhuma cobrança real foi gerada.</p>}
            </div>
            <div className="grid mb-4 place-items-center">
              <img src={pixData.qr_code_base64} alt="QR Code PIX" className="w-48 h-48 border-4 rounded-xl border-blue-500" />
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(pixData.qr_code); showToastMessage('Código PIX copiado!'); }}
              className="w-full py-2 text-sm font-bold border-0 rounded-xl text-blue-600 bg-blue-50"
            >
              Copiar Código
            </button>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="p-5 mb-4 text-center bg-white border-2 rounded-2xl border-accent">
            <div className="mb-2 text-5xl">✅</div>
            <h3 className="m-0 text-lg font-bold text-accent-dark">Pagamento Aprovado!</h3>
            <button onClick={() => { setPaymentStatus('idle'); navigate('home'); }} className="px-6 py-2 mt-4 text-sm font-bold text-white border-0 rounded-xl bg-accent">
              Voltar ao Início
            </button>
          </div>
        )}

        {paymentStatus === 'failure' && (
          <div className="p-5 mb-4 bg-white border-2 rounded-2xl border-danger">
            <div className="mb-2 text-5xl">⚠️</div>
            <h3 className="m-0 text-lg font-bold text-danger">Não foi possível concluir</h3>
            <p className="m-0 mt-1 text-sm text-slate-600">{paymentError || 'Tente novamente em alguns instantes.'}</p>
            <button onClick={() => setPaymentStatus('idle')} className="px-6 py-2 mt-4 text-sm font-bold text-white border-0 rounded-xl bg-accent">
              Tentar de novo
            </button>
          </div>
        )}

        {paymentStatus === 'idle' && (
          <>
            <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
              <h3 className="m-0 mb-3 text-sm font-bold">Dados do Comprador</h3>
              <div className="space-y-2">
                <input type="email" placeholder="E-mail" className="input" value={buyerData.email} onChange={(e) => setBuyerData({ ...buyerData, email: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nome" className="input" value={buyerData.firstName} onChange={(e) => setBuyerData({ ...buyerData, firstName: e.target.value })} />
                  <input type="text" placeholder="Sobrenome" className="input" value={buyerData.lastName} onChange={(e) => setBuyerData({ ...buyerData, lastName: e.target.value })} />
                </div>
                <input
                  type="text"
                  placeholder="CPF"
                  className="input"
                  value={buyerData.identification.number}
                  onChange={(e) => setBuyerData({ ...buyerData, identification: { ...buyerData.identification, number: formatCPF(e.target.value) } })}
                />
              </div>
            </div>

            <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Resumo</span>
                <span className="text-lg font-bold font-display text-accent">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
              <h3 className="m-0 mb-3 text-sm font-bold">Forma de Pagamento</h3>
              <div className="space-y-2">
                {([
                  { key: 'pix' as const, icon: '⚡', label: 'PIX', hint: '5% de desconto' },
                  { key: 'credit_card' as const, icon: '💳', label: 'Cartão', hint: 'até 12x' },
                  { key: 'boleto' as const, icon: '📄', label: 'Boleto', hint: 'vence em 3 dias' },
                ]).map((method) => (
                  <button
                    key={method.key}
                    onClick={() => setPaymentMethod(method.key)}
                    className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all ${paymentMethod === method.key ? 'border-accent bg-accent-light' : 'border-line'}`}
                    aria-pressed={paymentMethod === method.key}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold">{method.label}</div>
                      <div className="text-xs text-slate-500">{method.hint}</div>
                    </div>
                    {paymentMethod === method.key && <IconCheck size={18} className="text-accent" />}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'credit_card' && (
              <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
                <h3 className="m-0 mb-3 text-sm font-bold">Dados do Cartão</h3>
                <div className="space-y-2">
                  <input type="text" placeholder="Número do Cartão" className="input" value={cardData.number} maxLength={19} onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })} />
                  <input type="text" placeholder="Nome no Cartão" className="input" value={cardData.holderName} onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="input"
                      maxLength={5}
                      value={cardData.expirationMonth + (cardData.expirationYear ? '/' + cardData.expirationYear : '')}
                      onChange={(e) => {
                        const [month, year] = formatExpirationDate(e.target.value).split('/');
                        setCardData({ ...cardData, expirationMonth: month || '', expirationYear: year || '' });
                      }}
                    />
                    <input type="text" placeholder="CVV" className="input" maxLength={4} value={cardData.cvv} onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                    <select className="input" value={cardData.installments} onChange={(e) => setCardData({ ...cardData, installments: Number(e.target.value) })}>
                      {[1, 2, 3, 6, 12].map((n) => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                  <input type="text" placeholder="CPF do titular" className="input" value={cardData.cpf} onChange={(e) => setCardData({ ...cardData, cpf: formatCPF(e.target.value) })} />
                </div>
              </div>
            )}

            <button onClick={processPayment} disabled={isProcessing} className="w-full py-4 text-sm font-bold text-white border-0 rounded-2xl bg-accent hover:bg-accent-dark disabled:opacity-50">
              {isProcessing ? 'Processando...' : `Pagar ${formatCurrency(paymentMethod === 'pix' ? pixTotal : cartTotal)}`}
            </button>
            <p className="mt-3 text-xs text-center text-slate-400">
              Pagamentos processados pelo Mercado Pago. O Access Token fica no servidor, nunca no app.
            </p>
          </>
        )}
      </div>
    </div>
  );

  const renderProfilePage = () => (
    <div className="animate-fadeIn">
      <div className="px-4">
        <h2 className="m-0 mb-4 text-2xl font-bold font-display">Perfil</h2>
        <div className="p-5 mb-5 border rounded-3xl border-line bg-gradient-to-br from-accent-light to-white">
          <div className="grid w-20 h-20 mx-auto mb-3 overflow-hidden text-4xl bg-white rounded-full shadow-md place-items-center">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="object-cover w-full h-full" />
            ) : '👤'}
          </div>
          <h3 className="m-0 text-lg font-bold text-center">{currentUser?.name || 'Usuário'}</h3>
          <p className="m-0 mt-1 text-sm text-center text-slate-500">{currentUser?.email}</p>
          <p className="m-0 mt-1 text-xs text-center text-slate-500">{cityName}</p>
        </div>

        <div className="grid gap-3">
          <div className="p-4 bg-white border rounded-2xl border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">📍 Cidade</span>
              <button onClick={changeCity} className="text-sm font-bold border-0 bg-transparent text-accent">Alterar</button>
            </div>
            <p className="m-0 text-sm text-slate-500">{cityName}</p>
          </div>

          {[
            { page: 'partnerships' as Page, label: 'Parcerias', icon: <IconGift size={18} /> },
            { page: 'hire' as Page, label: 'Trabalhe Conosco', icon: <IconStore size={18} /> },
            { page: 'shared-lists' as Page, label: 'Listas Compartilhadas', icon: <IconList size={18} /> },
            { page: 'price-history' as Page, label: 'Histórico de Preços', icon: <IconChart size={18} /> },
            { page: 'price-alerts' as Page, label: 'Alertas de Preço', icon: <IconBell size={18} /> },
            { page: 'cashback' as Page, label: 'Cashback', icon: <IconWallet size={18} /> },
            { page: 'loyalty' as Page, label: 'Cartão Fidelidade', icon: <IconGift size={18} /> },
            { page: 'scanner' as Page, label: 'Scanner de Código', icon: <IconCamera size={18} /> },
            { page: 'tracking' as Page, label: 'Tracking de Entrega', icon: <IconTruck size={18} /> },
            { page: 'recipes' as Page, label: 'Receitas', icon: <IconChef size={18} /> },
            { page: 'flyers' as Page, label: 'Catálogos Digitais', icon: <IconBook size={18} /> },
            { page: 'scheduling' as Page, label: 'Agendar Entrega', icon: <IconCalendar size={18} /> },
            { page: 'terms' as Page, label: 'Termos de Uso', icon: <IconShield size={18} /> },
            { page: 'privacy' as Page, label: 'Privacidade', icon: <IconLock size={18} /> },
            { page: 'partner-rules' as Page, label: 'Regras para Parceiros', icon: <IconTag size={18} /> },
          ].map((item) => (
            <button key={item.page} onClick={() => navigate(item.page)} className="flex items-center gap-3 p-4 text-left bg-white border rounded-2xl border-line card-interactive">
              <span className="text-accent">{item.icon}</span>
              <span className="flex-1 text-sm font-bold">{item.label}</span>
              <IconChevronRight className="text-slate-300" size={18} />
            </button>
          ))}

          <div className="p-4 bg-white border rounded-2xl border-line">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Favoritos</span>
              <span className="text-sm font-bold text-accent-dark">{favorites.length}</span>
            </div>
          </div>
          <div className="p-4 bg-white border rounded-2xl border-line">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Economia acumulada</span>
              <span className="text-sm font-bold text-accent-dark">{formatCurrency(totalSavings)}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full py-3 mt-2 text-sm font-bold border-2 rounded-2xl text-danger bg-red-50 border-red-100">
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onNavigate={(page) => setCurrentPage(page as Page)} />;
  }

  return (
    <div className="app-shell">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <button onClick={() => navigate('home')} className="flex items-center gap-2 border-0 bg-transparent">
          <img src={APP_LOGO} alt="Preço Perto" className="w-9 h-9 rounded-xl" />
          <div className="text-left">
            <div className="text-base font-bold leading-tight font-display">Preço Perto</div>
            <div className="text-[10px] font-medium text-slate-500">Compare e economize</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('price-alerts')} className="grid w-10 h-10 border rounded-xl place-items-center bg-surface-alt border-line text-slate-500" aria-label="Alertas de preço">
            <IconBell size={20} />
          </button>
          <button onClick={() => navigate('cart')} className="relative grid w-10 h-10 border rounded-xl place-items-center bg-surface-alt border-line text-slate-500" aria-label="Lista de compras">
            <IconCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 grid w-5 h-5 text-[10px] font-bold text-white rounded-full place-items-center bg-accent">{totalItems}</span>
            )}
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2.5 px-3 py-2.5 mx-4 mt-3 mb-4 text-[13px] rounded-xl bg-slate-100">
        <span className="text-[17px] text-accent">📍</span>
        <div><strong>Entregar em:</strong> {cityName}</div>
        <button onClick={changeCity} className="ml-auto font-bold border-0 bg-transparent text-accent">Alterar</button>
      </div>

      {currentPage === 'home' && renderHomePage()}
      {currentPage === 'stores' && renderStoresPage()}
      {currentPage === 'store-detail' && renderStoreDetailPage()}
      {currentPage === 'category' && renderCategoryPage()}
      {currentPage === 'map' && renderMapPage()}
      {currentPage === 'partnerships' && renderPartnershipsPage()}
      {currentPage === 'hire' && renderHirePage()}
      {currentPage === 'contracts' && renderContractsPage()}
      {currentPage === 'cart' && renderCartPage()}
      {currentPage === 'checkout' && renderCheckoutPage()}
      {currentPage === 'profile' && renderProfilePage()}
      {currentPage === 'terms' && <TermsPage onBack={() => navigate('home')} />}
      {currentPage === 'privacy' && <PrivacyPage onBack={() => navigate('home')} />}
      {currentPage === 'partner-rules' && <PartnerRulesPage onBack={() => navigate('home')} />}
      {currentPage === 'shared-lists' && <SharedLists userId={currentUser?.email || ''} onBack={() => navigate('home')} />}
      {currentPage === 'price-history' && <PriceHistory productId="p1" productName="Arroz Tio João 5kg" currentPrice={28.9} store="Supermercado Zaffari" onBack={() => navigate('home')} />}
      {currentPage === 'price-alerts' && <PriceAlerts onBack={() => navigate('home')} />}
      {currentPage === 'cashback' && <CashbackWallet onBack={() => navigate('home')} />}
      {currentPage === 'loyalty' && <LoyaltyCard onBack={() => navigate('home')} />}
      {currentPage === 'scanner' && <BarcodeScanner onBack={() => navigate('home')} />}
      {currentPage === 'tracking' && <DeliveryTracking onBack={() => navigate('home')} />}
      {currentPage === 'recipes' && <Recipes onBack={() => navigate('home')} />}
      {currentPage === 'flyers' && <DigitalFlyers onBack={() => navigate('home')} />}
      {currentPage === 'scheduling' && <DeliveryScheduling onBack={() => navigate('home')} />}

      <nav className="bottom-nav" aria-label="Navegação principal">
        {[
          { page: 'home' as Page, icon: <IconHome size={22} />, label: 'Início', active: currentPage === 'home' },
          { page: 'stores' as Page, icon: <IconStore size={22} />, label: 'Lojas', active: ['stores', 'store-detail'].includes(currentPage) },
          { page: 'map' as Page, icon: <IconMap size={22} />, label: 'Mapa', active: currentPage === 'map' },
          { page: 'cart' as Page, icon: <IconCart size={22} />, label: 'Lista', active: ['cart', 'checkout'].includes(currentPage) },
          { page: 'profile' as Page, icon: <IconUser size={22} />, label: 'Perfil', active: currentPage === 'profile' },
        ].map((item) => (
          <button
            key={item.page}
            onClick={() => navigate(item.page)}
            className={`nav-item ${item.active ? 'active' : ''}`}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={`toast-notification ${showToast ? 'show' : ''}`} role="status" aria-live="polite">{toastMessage}</div>
    </div>
  );
}
