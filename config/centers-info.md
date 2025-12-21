# BLS Algeria Centers Information

## Supported Centers

### Algiers
- **Algiers 1** - Code: `algiers_1`
- **Algiers 2** - Code: `algiers_2`
- **Algiers 3** - Code: `algiers_3`
- **Algiers 4** - Code: `algiers_4`

### Oran
- **Oran 1** - Code: `oran_1`
- **Oran 2** - Code: `oran_2`
- **Oran 3** - Code: `oran_3`

## Visa Categories

All visa subcategories are supported:
- Tourist Visa (`tourist`)
- Student Visa (`student`)
- Work Visa (`work`)
- Business Visa (`business`)
- Transit Visa (`transit`)
- Family Visa (`family`)
- Medical Visa (`medical`)
- Cultural Visa (`cultural`)
- Sports Visa (`sports`)
- Official Visa (`official`)
- Diplomatic Visa (`diplomatic`)

## Usage in API

When creating a profile or starting a monitor, use the center codes:

```json
{
  "blsCenter": "algiers_1",  // or any other center code
  "visaCategory": "tourist"  // or any other visa category
}
```

