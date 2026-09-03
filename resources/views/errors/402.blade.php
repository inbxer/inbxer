@extends('errors::minimal')

@section('title', __('Payment Required'))
@section('code', '402')
@section('message', __('Payment required'))
@section('hint', __('This action requires an active subscription or payment.'))
