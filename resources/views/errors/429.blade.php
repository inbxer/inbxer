@extends('errors::minimal')

@section('title', __('Too Many Requests'))
@section('code', '429')
@section('message', __('Too many requests'))
@section('hint', __("You've made too many requests in a short time. Please wait a moment and try again."))
