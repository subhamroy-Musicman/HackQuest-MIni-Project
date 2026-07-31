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
    avatar: '🎨',
    address: 'inj14au322k9munkmx5hz3ntcq5kflwkk28qcu9j0j', // Random mock address
    totalRaised: '150.5',
  },
  {
    id: '2',
    name: 'Web3 Cafe',
    bio: 'Your daily dose of crypto news and alpha.',
    avatar: '☕',
    address: 'inj13n0qutstt2w9s6kssgudpxedj3f03y5s0r92j7',
    totalRaised: '45.0',
  },
  {
    id: '3',
    name: 'Injective Builders',
    bio: 'Supporting the ecosystem with open source tools.',
    avatar: '💻',
    address: 'inj15wwhx0u2439rttts9yhwl0tq0psap6t4q7299w',
    totalRaised: '890.2',
  },
  {
    id: '4',
    name: 'Music Creator',
    bio: 'Producing beats and soundscapes for the metaverse.',
    avatar: '🎵',
    address: 'inj1t8cwewdtyluzsq85pcf2u4y26pwe9yqslw62h3',
    totalRaised: '12.4',
  },
  {
    id: '5',
    name: 'Open Source Dev',
    bio: 'Maintaining core libraries for the community.',
    avatar: '❤️',
    address: 'inj122wqqm6q5e3qym23d9muee3nkr8h2n20wz5s9n',
    totalRaised: '320.0',
  },
]
