# JulkiTerhikki/JulkiSuosikki API Client
A command-line client that queries the Finnish registers of social welfare and healthcare professionals, bypassing a simple CAPTCHA.  
This exists because I was bored and wanted to try out Deno.

## Usage
    deno run --allow-net=julkiterhikki.valvira.fi --lock=lock.json julkiterhikki.ts [OPTIONS] <firstName> [<firstName>...] <lastName>
Options available:
* `-i <integer>`: when the API returns a list of similarly named people, this is used as a discriminator

## To-do
* If enough people have the same name, the API only returns a list of professional rights that can be used to filter the query. This client currently has no way to specify such a filter.
