<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $currencies = [
            ['code' => 'USD', 'name' => 'US Dollar',          'symbol' => '$',  'rate' => 1.0],
            ['code' => 'EUR', 'name' => 'Euro',                'symbol' => '€',  'rate' => 0.92],
            ['code' => 'GBP', 'name' => 'British Pound',       'symbol' => '£',  'rate' => 0.79],
            ['code' => 'CAD', 'name' => 'Canadian Dollar',     'symbol' => 'C$', 'rate' => 1.36],
            ['code' => 'AUD', 'name' => 'Australian Dollar',   'symbol' => 'A$', 'rate' => 1.53],
            ['code' => 'JPY', 'name' => 'Japanese Yen',        'symbol' => '¥',  'rate' => 149.5],
            ['code' => 'CNY', 'name' => 'Chinese Yuan',        'symbol' => '¥',  'rate' => 7.24],
            ['code' => 'INR', 'name' => 'Indian Rupee',        'symbol' => '₹',  'rate' => 83.1],
            ['code' => 'CHF', 'name' => 'Swiss Franc',         'symbol' => 'Fr', 'rate' => 0.90],
            ['code' => 'SEK', 'name' => 'Swedish Krona',       'symbol' => 'kr', 'rate' => 10.42],
            ['code' => 'NOK', 'name' => 'Norwegian Krone',     'symbol' => 'kr', 'rate' => 10.55],
            ['code' => 'DKK', 'name' => 'Danish Krone',        'symbol' => 'kr', 'rate' => 6.89],
            ['code' => 'PLN', 'name' => 'Polish Zloty',        'symbol' => 'zł', 'rate' => 3.97],
            ['code' => 'BRL', 'name' => 'Brazilian Real',      'symbol' => 'R$', 'rate' => 4.97],
            ['code' => 'MXN', 'name' => 'Mexican Peso',        'symbol' => '$',  'rate' => 17.15],
            ['code' => 'SGD', 'name' => 'Singapore Dollar',    'symbol' => 'S$', 'rate' => 1.34],
            ['code' => 'HKD', 'name' => 'Hong Kong Dollar',    'symbol' => 'HK$','rate' => 7.83],
            ['code' => 'NZD', 'name' => 'New Zealand Dollar',  'symbol' => 'NZ$','rate' => 1.63],
            ['code' => 'ZAR', 'name' => 'South African Rand',  'symbol' => 'R',  'rate' => 18.63],
            ['code' => 'AED', 'name' => 'UAE Dirham',          'symbol' => 'د.إ','rate' => 3.67],
        ];

        foreach ($currencies as $data) {
            Currency::firstOrCreate(['code' => $data['code']], $data);
        }
    }
}
