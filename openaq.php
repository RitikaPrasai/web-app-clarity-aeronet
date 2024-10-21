<?php

header('Content-Type: application/json; charset=utf-8');

$opts = array(
    'http'=>array(
        'method'=>'GET',
        'header'=>"X-Api-Key : 7ee2b90d12a4fb108c832570e1ee1b1a17fdb7618b40bcb29b14b52eb6a8c7be \r\n".
        "Accept-Encoding: gzip \r\n".
        "Content-Type : application/json \r\n"
    )
    );

    $context = stream_context_create($opts);
    $url = "https://api.openaq.org/v2/countries";

    if (isset($_GET['country'])) {
        $url = "https://api.openaq.org/v2/measurements?country=".$_GET['country'];
    } 

    if (isset($_GET['data'])) {
        $url = "/home/rprasai/openaq/data2/openaq.csv";
    } 


    $response = file_get_contents($url,false,$context);
    echo $response;


?>