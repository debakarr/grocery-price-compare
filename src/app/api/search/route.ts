import { NextRequest } from 'next/server'
import { searchAllStores } from '@/lib/stores'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const pincode = searchParams.get('pincode')?.trim() || '734011'
  const sort = searchParams.get('sort') || 'relevance'

  if (!query) {
    return Response.json({ error: 'Missing query parameter q' }, { status: 400 })
  }

  try {
    const data = await searchAllStores(query, pincode)
    const matches = [...data.matched]

    if (sort === 'price_asc') {
      matches.sort((a, b) => a.minPrice - b.minPrice)
    } else if (sort === 'price_desc') {
      matches.sort((a, b) => b.minPrice - a.minPrice)
    } else if (sort === 'unit_price_asc') {
      matches.sort((a, b) => a.minPricePerUnit - b.minPricePerUnit)
    } else if (sort === 'unit_price_desc') {
      matches.sort((a, b) => b.minPricePerUnit - a.minPricePerUnit)
    } else if (sort === 'store_count_desc') {
      matches.sort((a, b) => b.variants.length - a.variants.length)
    }
    else {
      matches.sort((a, b) => a.relevance - b.relevance || a.minPrice - b.minPrice)
    }

    return Response.json({ ...data, matched: matches }, {
      headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120' },
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
