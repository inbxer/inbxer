@extends('errors::minimal')

@section('title', __('Server Error'))
@section('code', '500')
@section('message', __('Something broke'))
@section('hint', __("An unexpected error occurred on our end. We've been notified — please try again shortly."))
