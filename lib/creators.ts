export interface Creator {
  id: string
  name: string
  bio: string
  avatar: string
  address: string
  totalRaised: string
}

export const MOCK_CREATORS: Creator[] = [
  {
    id: '1',
    name: 'Alice (NFT Artist)',
    bio: 'Creating beautiful on-chain generative art.',
    avatar: '/img/avatar_alice.jpg',
    address: 'inj14au322k9munkmx5hz3ntcq5kflwkk28qcu9j0j', // Random mock address
    totalRaised: '150.5',
  },
  {
    id: '2',
    name: 'Web3 Cafe',
    bio: 'Your daily dose of crypto news and alpha.',
    avatar: '/img/web3_cafe_logo.jpg',
    address: 'inj13n0qutstt2w9s6kssgudpxedj3f03y5s0r92j7',
    totalRaised: '45.0',
  },
  {
    id: '3',
    name: 'Injective Builders',
    bio: 'Supporting the ecosystem with open source tools.',
    avatar: '/img/injective_builders_logo.jpg',
    address: 'inj15wwhx0u2439rttts9yhwl0tq0psap6t4q7299w',
    totalRaised: '890.2',
  },
  {
    id: '4',
    name: 'Music Creator',
    bio: 'Producing beats and soundscapes for the metaverse.',
    avatar: '/img/music_creator_logo.jpg',
    address: 'inj1t8cwewdtyluzsq85pcf2u4y26pwe9yqslw62h3',
    totalRaised: '12.4',
  },
  {
    id: '5',
    name: 'Open Source Dev',
    bio: 'Maintaining core libraries for the community.',
    avatar: '/img/open_source_dev_logo.jpg',
    address: 'inj122wqqm6q5e3qym23d9muee3nkr8h2n20wz5s9n',
    totalRaised: '320.0',
  },
  {
    id: '6',
    name: 'Smart Contract Auditor',
    bio: 'Securing the ecosystem one line of code at a time.',
    avatar: '/img/smart_contract_auditor_logo.jpg',
    address: 'inj173qwye26q5e3qym23d9muee3nkr8h2n30x12z',
    totalRaised: '1050.0',
  },
  {
    id: '7',
    name: 'DeFi Strategist',
    bio: 'Building advanced automated yield vaults.',
    avatar: '/img/defi_strategist_logo.jpg',
    address: 'inj199dsqq6q5e3qym23d9muee3nkr8h2n80a9b8c',
    totalRaised: '42.5',
  },
  {
    id: '8',
    name: 'UI/UX Designer',
    bio: 'Crafting beautiful Web3 experiences for the masses.',
    avatar: '/img/ui_ux_designer_logo.jpg',
    address: 'inj111fvwq6q5e3qym23d9muee3nkr8h2n55x99d1',
    totalRaised: '210.8',
  },
]
