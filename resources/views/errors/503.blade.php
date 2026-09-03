@extends('errors::minimal')

@section('title', __('Service Unavailable'))
@section('code', '503')
@section('message', __('Down for maintenance'))
@section('hint', __("We're performing scheduled maintenance. We'll be back shortly."))
