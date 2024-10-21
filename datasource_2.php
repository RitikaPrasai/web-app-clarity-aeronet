<?php 


$datasource = ""; 
$date = "";
if (isset($_GET['datasource'])) {
    $datasource = $_GET['datasource'];
} 

if (isset($_GET['date'])) {
    $temp_date = $_GET['date'];
    $tmp = date_parse_from_format("Y-m-d", $temp_date);
    $str_time = strtotime($temp_date);
    $new_date =$tmp['year'].'-'.$tmp['month'].'-'.$tmp['day'];
    $tmp_str_time = strtotime($new_date);
    
    if($str_time!=$tmp_str_time){
        $datasource = "";
        echo "DATE_NOT_VALID";
    }
    $date = $temp_date;
} 


$url = "";

switch($datasource){
    case 'openaq':
        $url = "/var/www/html/aeronet/data_push/rprasai/openaq/data/openaq_".$date.".csv";
        break;
    case 'clarity_nasa_node':
        $url = "/var/www/html/aeronet/data_push/rprasai/clarity/data/NASA_node_".$date.".csv";
        break;
    case 'clarity_open_node':
        $url = "/var/www/html/aeronet/data_push/rprasai/clarity/data/open_node_".$date.".csv";
        break;
}

if($url==""){
    echo "No Datasource";
}

$response = file_get_contents($url,false,$context);
echo $response;

?>
